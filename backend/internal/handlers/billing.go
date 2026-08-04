package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/config"
	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/legacyauth"
	"mahu-backend/internal/middleware"
	"mahu-backend/internal/models"
)

// Local product catalogue - PayDunya has no concept of recurring plans, so
// billing is invoice-based: each checkout renews the plan for 30 days.
var planPricesXof = map[string]int{
	"premium": 5000,
	"pro":     15000,
}

func (d *Deps) paydunyaBaseURL() string {
	if d.Env.PaydunyaMode == "live" {
		return "https://app.paydunya.com/api/v1"
	}
	return "https://app.paydunya.com/sandbox-api/v1"
}

func (d *Deps) paydunyaHeaders() map[string]string {
	return map[string]string{
		"Content-Type":        "application/json",
		"PAYDUNYA-MASTER-KEY":  d.Env.PaydunyaMasterKey,
		"PAYDUNYA-PRIVATE-KEY": d.Env.PaydunyaPrivateKey,
		"PAYDUNYA-PUBLIC-KEY":  d.Env.PaydunyaPublicKey,
		"PAYDUNYA-TOKEN":       d.Env.PaydunyaToken,
	}
}

func doPaydunyaRequest(method, url string, headers map[string]string, body any) (*http.Response, error) {
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequest(method, url, reader)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	return http.DefaultClient.Do(req)
}

type checkoutRequest struct {
	Plan string `json:"plan"`
}

type paydunyaInvoiceResponse struct {
	ResponseCode string `json:"response_code"`
	ResponseText string `json:"response_text"`
	Token        string `json:"token"`
	InvoiceURL   string `json:"invoice_url"`
}

func (d *Deps) CreateCheckout(w http.ResponseWriter, r *http.Request) {
	var req checkoutRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || (req.Plan != "premium" && req.Plan != "pro") {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if d.Env.PaydunyaMasterKey == "" {
		httpx.WriteError(w, http.StatusServiceUnavailable, "Billing is not configured yet")
		return
	}

	authUser, ok := middleware.User(r)
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Missing token")
		return
	}
	userObjID, err := primitive.ObjectIDFromHex(authUser.Sub())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Missing token")
		return
	}

	ctx := r.Context()
	var user models.User
	if err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"_id": userObjID}).Decode(&user); err != nil {
		httpx.WriteError(w, http.StatusNotFound, "User not found")
		return
	}

	plan := req.Plan
	amount := planPricesXof[plan]

	payload := map[string]any{
		"invoice": map[string]any{
			"total_amount": amount,
			"description":  "Abonnement mahu-app - plan " + plan,
		},
		"store": map[string]any{"name": "mahu-app"},
		"custom_data": map[string]any{
			"userId": user.ID.Hex(),
			"plan":   plan,
		},
		"actions": map[string]any{
			"callback_url": d.Env.PaydunyaWebhookURL,
			"return_url":   d.Env.AppURL + "/dashboard/abonnement?status=success",
			"cancel_url":   d.Env.AppURL + "/dashboard/abonnement?status=cancelled",
		},
	}

	resp, err := doPaydunyaRequest("POST", d.paydunyaBaseURL()+"/checkout-invoice/create", d.paydunyaHeaders(), payload)
	if err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "PayDunya injoignable")
		return
	}
	defer resp.Body.Close()

	var invoiceData paydunyaInvoiceResponse
	if err := json.NewDecoder(resp.Body).Decode(&invoiceData); err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "PayDunya checkout failed")
		return
	}

	if invoiceData.ResponseCode != "00" || invoiceData.Token == "" || invoiceData.InvoiceURL == "" {
		msg := invoiceData.ResponseText
		if msg == "" {
			msg = "PayDunya checkout failed"
		}
		httpx.WriteError(w, http.StatusBadGateway, msg)
		return
	}

	_, err = db.Collection(models.SubscriptionsCollection).UpdateOne(ctx,
		bson.M{"userId": user.ID},
		bson.M{"$set": bson.M{"paydunyaInvoiceToken": invoiceData.Token, "updatedAt": time.Now()}},
		options.Update().SetUpsert(true),
	)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"checkoutUrl": invoiceData.InvoiceURL})
}

type paydunyaConfirmResponse struct {
	Status     string `json:"status"`
	CustomData struct {
		UserID string `json:"userId"`
		Plan   string `json:"plan"`
	} `json:"custom_data"`
}

func extractInvoiceToken(body []byte) string {
	if values, err := url.ParseQuery(string(body)); err == nil {
		if raw := values.Get("data"); raw != "" {
			var parsed struct {
				Invoice struct {
					Token string `json:"token"`
				} `json:"invoice"`
			}
			if json.Unmarshal([]byte(raw), &parsed) == nil && parsed.Invoice.Token != "" {
				return parsed.Invoice.Token
			}
		}
		if tok := values.Get("data[invoice][token]"); tok != "" {
			return tok
		}
	}

	var parsed struct {
		Data struct {
			Invoice struct {
				Token string `json:"token"`
			} `json:"invoice"`
		} `json:"data"`
	}
	if json.Unmarshal(body, &parsed) == nil && parsed.Data.Invoice.Token != "" {
		return parsed.Data.Invoice.Token
	}
	return ""
}

func (d *Deps) PaydunyaWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Missing invoice token")
		return
	}
	defer r.Body.Close()

	token := extractInvoiceToken(body)
	if token == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Missing invoice token")
		return
	}

	// Never trust the webhook payload for the payment status - always confirm
	// server-side against PayDunya directly, as recommended by their docs.
	resp, err := doPaydunyaRequest("GET", d.paydunyaBaseURL()+"/checkout-invoice/confirm/"+token, d.paydunyaHeaders(), nil)
	if err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
		return
	}
	defer resp.Body.Close()

	var confirmData paydunyaConfirmResponse
	if err := json.NewDecoder(resp.Body).Decode(&confirmData); err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
		return
	}

	if confirmData.Status != "completed" || confirmData.CustomData.UserID == "" || confirmData.CustomData.Plan == "" {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
		return
	}

	userID, plan := confirmData.CustomData.UserID, confirmData.CustomData.Plan
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
		return
	}

	ctx := r.Context()

	if err := applyPlanUpgrade(ctx, userObjID, plan); err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
		return
	}

	if err := recordPayment(ctx, userObjID, plan, models.PaymentProviderPaydunya, token); err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
}

// applyPlanUpgrade activates a plan on the user's subscription (30-day
// renewal, credits refilled to the plan's daily allowance) - shared by every
// payment provider's webhook once it has confirmed a completed payment.
func applyPlanUpgrade(ctx context.Context, userID primitive.ObjectID, plan string) error {
	renewsAt := time.Now().Add(30 * 24 * time.Hour)
	dailyCredits := config.AIPlans[plan].DailyCredits

	_, err := db.Collection(models.SubscriptionsCollection).UpdateOne(ctx,
		bson.M{"userId": userID},
		bson.M{"$set": bson.M{
			"plan":           plan,
			"renewsAt":       renewsAt,
			"creditBalance":  dailyCredits,
			"creditsRenewAt": time.Now(),
			"updatedAt":      time.Now(),
		}, "$setOnInsert": bson.M{"userId": userID, "createdAt": time.Now()}},
		options.Update().SetUpsert(true),
	)
	return err
}

// recordPayment logs a confirmed payment, upserting on the unique external
// reference (invoice token or checkoutId) since providers can call their
// webhook more than once for the same payment - this keeps the log idempotent.
func recordPayment(ctx context.Context, userID primitive.ObjectID, plan, provider, externalRef string) error {
	now := time.Now()
	_, err := db.Collection(models.PaymentsCollection).UpdateOne(ctx,
		bson.M{"paydunyaInvoiceToken": externalRef},
		bson.M{"$setOnInsert": bson.M{
			"userId":               userID,
			"plan":                 plan,
			"provider":             provider,
			"amountXof":            planPricesXof[plan],
			"paydunyaInvoiceToken": externalRef,
			"confirmedAt":          now,
			"createdAt":            now,
			"updatedAt":            now,
		}},
		options.Update().SetUpsert(true),
	)
	if err != nil && err != mongo.ErrNoDocuments {
		return err
	}
	return nil
}

// --- PawaPay (mobile money checkout) - NEW, UNVERIFIED against a live
// account (no token available while building this). Uses PawaPay's hosted
// "Checkouts" flow (docs.pawapay.io/v2/docs/checkouts), which - unlike the
// raw Deposits API - needs no phone-number collection UI on our side and
// lets the customer pick their own country/wallet on PawaPay's page, so
// PawaPayCountries only bounds which countries are *offered*, not which the
// customer can actually use.

type pawaPayAmount struct {
	Country  string `json:"country"`
	Currency string `json:"currency"`
	Amount   string `json:"amount"`
}

type pawaPayCheckoutRequest struct {
	CheckoutID string           `json:"checkoutId"`
	ReturnURL  string           `json:"returnUrl"`
	Amounts    []pawaPayAmount  `json:"amounts"`
	Reason     string           `json:"reason,omitempty"`
}

type pawaPayCheckoutResponse struct {
	CheckoutID  string `json:"checkoutId"`
	Status      string `json:"status"`
	RedirectURL string `json:"redirectUrl"`
	FailureReason struct {
		FailureMessage string `json:"failureMessage"`
	} `json:"failureReason"`
}

func (d *Deps) pawaPayHeaders() map[string]string {
	return map[string]string{
		"Content-Type":  "application/json",
		"Authorization": "Bearer " + d.Env.PawaPayAPIToken,
	}
}

func doPawaPayRequest(method, url string, headers map[string]string, body any) (*http.Response, error) {
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequest(method, url, reader)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	return http.DefaultClient.Do(req)
}

func (d *Deps) CreatePawaPayCheckout(w http.ResponseWriter, r *http.Request) {
	var req checkoutRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || (req.Plan != "premium" && req.Plan != "pro") {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if d.Env.PawaPayAPIToken == "" {
		httpx.WriteError(w, http.StatusServiceUnavailable, "Le paiement mobile money n'est pas configure")
		return
	}

	authUser, ok := middleware.User(r)
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Missing token")
		return
	}
	userObjID, err := primitive.ObjectIDFromHex(authUser.Sub())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Missing token")
		return
	}

	plan := req.Plan
	amount := planPricesXof[plan]

	checkoutID, err := legacyauth.NewUUID()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	amounts := make([]pawaPayAmount, 0, len(d.Env.PawaPayCountries))
	for _, country := range d.Env.PawaPayCountries {
		amounts = append(amounts, pawaPayAmount{
			Country:  country,
			Currency: d.Env.PawaPayCurrency,
			Amount:   strconv.Itoa(amount),
		})
	}

	payload := pawaPayCheckoutRequest{
		CheckoutID: checkoutID,
		ReturnURL:  d.Env.AppURL + "/dashboard/abonnement?status=success&provider=pawapay",
		Amounts:    amounts,
		Reason:     "Abonnement mahu-app - plan " + plan,
	}

	resp, err := doPawaPayRequest("POST", d.Env.PawaPayBaseURL()+"/v2/checkouts", d.pawaPayHeaders(), payload)
	if err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "PawaPay injoignable")
		return
	}
	defer resp.Body.Close()

	var checkoutData pawaPayCheckoutResponse
	if err := json.NewDecoder(resp.Body).Decode(&checkoutData); err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "PawaPay checkout failed")
		return
	}

	if checkoutData.RedirectURL == "" {
		msg := checkoutData.FailureReason.FailureMessage
		if msg == "" {
			msg = "PawaPay checkout failed"
		}
		httpx.WriteError(w, http.StatusBadGateway, msg)
		return
	}

	ctx := r.Context()
	now := time.Now()
	job := models.PawaPayCheckout{
		ID:         primitive.NewObjectID(),
		CheckoutID: checkoutID,
		UserID:     userObjID,
		Plan:       plan,
		AmountXof:  amount,
		Status:     models.PawaPayCheckoutPending,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if _, err := db.Collection(models.PawaPayCheckoutsCollection).InsertOne(ctx, job); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"checkoutUrl": checkoutData.RedirectURL})
}

func (d *Deps) PawaPayWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
		return
	}
	defer r.Body.Close()

	var callback struct {
		CheckoutID string `json:"checkoutId"`
	}
	if err := json.Unmarshal(body, &callback); err != nil || callback.CheckoutID == "" {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
		return
	}

	// Never trust the webhook payload for the payment status - always confirm
	// server-side against PawaPay directly, same rule as the PayDunya webhook.
	resp, err := doPawaPayRequest("GET", d.Env.PawaPayBaseURL()+"/v2/checkouts/"+callback.CheckoutID, d.pawaPayHeaders(), nil)
	if err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
		return
	}
	defer resp.Body.Close()

	var checkoutData pawaPayCheckoutResponse
	if err := json.NewDecoder(resp.Body).Decode(&checkoutData); err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
		return
	}

	ctx := r.Context()

	if checkoutData.Status != "COMPLETED" {
		if checkoutData.Status == "FAILED" || checkoutData.Status == "EXPIRED" || checkoutData.Status == "CANCELLED" {
			_, _ = db.Collection(models.PawaPayCheckoutsCollection).UpdateOne(ctx,
				bson.M{"checkoutId": callback.CheckoutID},
				bson.M{"$set": bson.M{"status": models.PawaPayCheckoutFailed, "updatedAt": time.Now()}})
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
		return
	}

	var checkout models.PawaPayCheckout
	if err := db.Collection(models.PawaPayCheckoutsCollection).FindOne(ctx, bson.M{"checkoutId": callback.CheckoutID}).Decode(&checkout); err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
		return
	}

	if err := applyPlanUpgrade(ctx, checkout.UserID, checkout.Plan); err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
		return
	}
	if err := recordPayment(ctx, checkout.UserID, checkout.Plan, models.PaymentProviderPawaPay, callback.CheckoutID); err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
		return
	}

	_, _ = db.Collection(models.PawaPayCheckoutsCollection).UpdateOne(ctx,
		bson.M{"checkoutId": callback.CheckoutID},
		bson.M{"$set": bson.M{"status": models.PawaPayCheckoutCompleted, "updatedAt": time.Now()}})

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
}
