package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/legacyauth"
	"mahu-backend/internal/models"
	"mahu-backend/internal/notify"
)

// paydunyaKindSignupDeposit tags the custom_data of a signup deposit invoice
// so PaydunyaWebhook can tell it apart from an AI plan upgrade.
const paydunyaKindSignupDeposit = "signup_deposit"

// defaultProducts is the catalogue as listed on mahu.cards/Boutique, used to
// seed an empty products collection. Prices/images are then edited in the
// admin panel, never here.
var defaultProducts = []models.Product{
	{Slug: "black-edition", Name: "Black Edition — Carte NFC", Description: "Fond noir satiné avec gravure laser de vos informations.", PriceXof: 25000, PriceIsFrom: true, Category: models.ProductCategoryNfcCard, Material: "PVC Premium", ImageURL: "https://mahu.cards/r/1.svg", Features: []string{"PVC Premium", "Gravure laser", "Puce NFC", "Profil activé"}},
	{Slug: "white-clean", Name: "White Clean — Carte NFC", Description: "Minimaliste et élégante. Design blanc épuré avec vos coordonnées.", PriceXof: 13900, PriceIsFrom: true, Category: models.ProductCategoryNfcCard, Material: "PVC blanc", ImageURL: "https://mahu.cards/r/2.svg", Features: []string{"PVC blanc", "Impression nette", "Puce NFC"}},
	{Slug: "gold-metal", Name: "Gold Metal — Carte NFC", Description: "Métal brossé, finition dorée et impression résistante aux UV.", PriceXof: 28000, PriceIsFrom: true, Category: models.ProductCategoryNfcCard, Material: "Métal", ImageURL: "https://mahu.cards/r/3.svg", Features: []string{"Métal brossé", "Finition or", "Puce NFC", "Impression UV"}},
	{Slug: "custom-design", Name: "Custom Design — Carte NFC", Description: "Votre propre design sur votre carte. Téléchargez votre logo.", PriceXof: 20000, PriceIsFrom: true, Category: models.ProductCategoryNfcCard, Material: "PVC", ImageURL: "https://mahu.cards/r/4.svg", Features: []string{"Design personnalisé", "Logo", "Éditeur en ligne", "Puce NFC"}},
	{Slug: "blue-wave", Name: "Blue Wave — Carte NFC", Description: "Design dynamique avec dégradé bleu électrique.", PriceXof: 13900, PriceIsFrom: true, Category: models.ProductCategoryNfcCard, Material: "PVC Premium", ImageURL: "https://mahu.cards/r/5.svg", Features: []string{"PVC Premium", "Dégradé UV", "Puce NFC"}},
	{Slug: "token-rfid-bleu", Name: "Token RFID UID — Bleu", Description: "Porte-clé RFID 13,56 MHz réinscriptible, UID modifiable.", PriceXof: 5000, Category: models.ProductCategoryRfidFob, Material: "Porte-clé", Features: []string{"13,56 MHz", "UID modifiable", "100 000 réécritures", "Contrôle d'accès"}},
	{Slug: "token-rfid-noir", Name: "Token RFID UID — Noir", Description: "Porte-clé RFID 13,56 MHz noir, usage professionnel.", PriceXof: 5000, Category: models.ProductCategoryRfidFob, Material: "Porte-clé", Features: []string{"13,56 MHz", "UID modifiable", "Compatible Mifare"}},
	{Slug: "carte-rfid-vierge", Name: "Carte RFID Vierge — Mifare Classic (lot de 10)", Description: "Carte PVC vierge réinscriptible pour accès, parking, pointage.", PriceXof: 5000, Category: models.ProductCategoryRfidCard, Material: "PVC vierge", Features: []string{"Réinscriptible", "Accès / parking / pointage"}},
	{Slug: "metal-premium", Name: "Carte Métal Premium", Description: "Carte de visite NFC en métal massif. Finition brossée.", PriceXof: 50000, Category: models.ProductCategoryNfcCard, Material: "Métal massif", Features: []string{"Métal massif", "Finition brossée", "Gravure laser", "Puce NFC"}},
	{Slug: "carte-bois", Name: "Carte en Bois — NFC", Description: "Carte de visite NFC en bois naturel. Unique, écologique.", PriceXof: 22000, Category: models.ProductCategoryNfcCard, Material: "Bois", Features: []string{"Bois naturel", "Gravure laser", "Puce NFC", "Écologique"}},
}

// SeedProducts inserts the Boutique catalogue once, when the collection is
// still empty - never overwrites what the admin has edited since.
func SeedProducts(ctx context.Context) error {
	coll := db.Collection(models.ProductsCollection)
	count, err := coll.CountDocuments(ctx, bson.M{})
	if err != nil || count > 0 {
		return err
	}
	now := time.Now()
	docs := make([]any, 0, len(defaultProducts))
	for i, p := range defaultProducts {
		p.ID = primitive.NewObjectID()
		p.Active = true
		p.SortOrder = i
		p.CreatedAt, p.UpdatedAt = now, now
		docs = append(docs, p)
	}
	_, err = coll.InsertMany(ctx, docs)
	if err == nil {
		log.Printf("[shop] seeded %d products", len(docs))
	}
	return err
}

func findProducts(ctx context.Context, filter bson.M) ([]models.Product, error) {
	cursor, err := db.Collection(models.ProductsCollection).Find(ctx, filter,
		options.Find().SetSort(bson.D{{Key: "sortOrder", Value: 1}, {Key: "createdAt", Value: 1}}))
	if err != nil {
		return nil, err
	}
	products := []models.Product{}
	err = cursor.All(ctx, &products)
	return products, err
}

// ListShopProducts is public (through the Next.js proxy): the active
// catalogue, for the signup product picker.
func (d *Deps) ListShopProducts(w http.ResponseWriter, r *http.Request) {
	products, err := findProducts(r.Context(), bson.M{"active": true})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"products": products, "depositXof": models.SignupDepositXof})
}

func depositFor(priceXof int) int {
	if priceXof > 0 && priceXof < models.SignupDepositXof {
		return priceXof
	}
	return models.SignupDepositXof
}

// returnBaseURL keeps PayDunya's return/cancel links on the domain the
// customer signed up from (ai.mahu.cards, call.mahu.cards, ...) instead of
// a single hardcoded one. Only mahu.cards subdomains and localhost are
// accepted, so it can't be turned into an open redirect.
func (d *Deps) returnBaseURL(origin string) string {
	u, err := url.Parse(origin)
	if err == nil && (u.Scheme == "https" || u.Scheme == "http") {
		host := u.Hostname()
		if host == "mahu.cards" || strings.HasSuffix(host, ".mahu.cards") || host == "localhost" {
			return u.Scheme + "://" + u.Host
		}
	}
	return d.Env.AppURL
}

type depositCheckoutRequest struct {
	ProductID       string `json:"productId"`
	ClientName      string `json:"clientName"`
	Email           string `json:"email"`
	Phone           string `json:"phone"`
	DeliveryAddress string `json:"deliveryAddress"`
	Password        string `json:"password"`
	Origin          string `json:"origin"`
}

// CreateDepositCheckout starts a signup paid by deposit: stores a pending
// CardOrder and returns the PayDunya invoice URL. The account itself is only
// created once the webhook confirms the payment.
func (d *Deps) CreateDepositCheckout(w http.ResponseWriter, r *http.Request) {
	var req depositCheckoutRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.ClientName = strings.TrimSpace(req.ClientName)
	req.Phone = strings.TrimSpace(req.Phone)
	if _, err := mail.ParseAddress(req.Email); err != nil || req.ClientName == "" || req.Phone == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Nom, email et telephone sont requis.")
		return
	}
	if len(req.Password) < 6 {
		httpx.WriteError(w, http.StatusBadRequest, "Le mot de passe doit contenir au moins 6 caracteres.")
		return
	}
	productID, err := primitive.ObjectIDFromHex(req.ProductID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Choisissez un produit.")
		return
	}
	if d.Env.PaydunyaMasterKey == "" {
		httpx.WriteError(w, http.StatusServiceUnavailable, "Le paiement en ligne n'est pas encore configure.")
		return
	}

	ctx := r.Context()
	var product models.Product
	if err := db.Collection(models.ProductsCollection).FindOne(ctx, bson.M{"_id": productID, "active": true}).Decode(&product); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Produit introuvable.")
		return
	}
	if existing, err := findUserByEmail(ctx, req.Email); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	} else if existing != nil {
		httpx.WriteError(w, http.StatusConflict, "Cet email est deja utilise. Connectez-vous.")
		return
	}

	passwordHash, err := legacyauth.HashPassword(req.Password)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	reference, err := legacyauth.NewUUID()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	now := time.Now()
	order := models.CardOrder{
		ID: primitive.NewObjectID(), Reference: reference,
		ProductID: product.ID, ProductName: product.Name, ProductPriceXof: product.PriceXof,
		DepositXof: depositFor(product.PriceXof),
		ClientName: req.ClientName, Email: req.Email, Phone: req.Phone,
		DeliveryAddress: strings.TrimSpace(req.DeliveryAddress), PasswordHash: passwordHash,
		PaymentStatus: models.OrderPaymentPending, DeliveryStatus: models.OrderDeliveryToPrepare,
		CreatedAt: now, UpdatedAt: now,
	}

	base := d.returnBaseURL(req.Origin)
	payload := map[string]any{
		"invoice": map[string]any{
			"total_amount": order.DepositXof,
			"description":  fmt.Sprintf("Acompte carte Mahu - %s", product.Name),
		},
		"store": map[string]any{"name": "Mahu"},
		"custom_data": map[string]any{
			"kind":     paydunyaKindSignupDeposit,
			"orderRef": reference,
		},
		"actions": map[string]any{
			"callback_url": d.Env.PaydunyaWebhookURL,
			"return_url":   base + "/register/paiement?ref=" + reference,
			"cancel_url":   base + "/register?cancelled=1",
		},
	}

	resp, err := doPaydunyaRequest("POST", d.paydunyaBaseURL()+"/checkout-invoice/create", d.paydunyaHeaders(), payload)
	if err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "PayDunya injoignable")
		return
	}
	defer resp.Body.Close()

	var invoice paydunyaInvoiceResponse
	if err := json.NewDecoder(resp.Body).Decode(&invoice); err != nil || invoice.ResponseCode != "00" || invoice.InvoiceURL == "" {
		msg := invoice.ResponseText
		if msg == "" {
			msg = "Le paiement PayDunya a echoue."
		}
		httpx.WriteError(w, http.StatusBadGateway, msg)
		return
	}

	order.PaydunyaToken = invoice.Token
	if _, err := db.Collection(models.CardOrdersCollection).InsertOne(ctx, order); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"checkoutUrl": invoice.InvoiceURL, "reference": reference})
}

// GetDepositOrderStatus lets the PayDunya return page poll until the webhook
// has confirmed the deposit. Knowing the (random UUID) reference is required.
func (d *Deps) GetDepositOrderStatus(w http.ResponseWriter, r *http.Request, reference string) {
	var order models.CardOrder
	err := db.Collection(models.CardOrdersCollection).FindOne(r.Context(), bson.M{"reference": reference}).Decode(&order)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Commande introuvable")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"paymentStatus": order.PaymentStatus,
		"email":         order.Email,
		"productName":   order.ProductName,
		"depositXof":    order.DepositXof,
		"remainingXof":  order.ProductPriceXof - order.DepositXof,
	})
}

// finalizeCardOrder runs once PayDunya has confirmed the deposit: creates the
// account from the order (idempotent - webhooks can be delivered twice),
// then notifies the client and the admins.
func (d *Deps) finalizeCardOrder(ctx context.Context, reference, invoiceToken string) error {
	coll := db.Collection(models.CardOrdersCollection)
	var order models.CardOrder
	if err := coll.FindOne(ctx, bson.M{"reference": reference}).Decode(&order); err != nil {
		return err
	}
	if order.PaymentStatus != models.OrderPaymentPending {
		return nil
	}

	user, err := findUserByEmail(ctx, order.Email)
	if err != nil {
		return err
	}
	if user == nil {
		user, err = createLegacyAccount(ctx, order.Email, order.PasswordHash, "", order.ClientName, order.Phone)
		if err != nil {
			return err
		}
	}

	now := time.Now()
	res, err := coll.UpdateOne(ctx, bson.M{"_id": order.ID, "paymentStatus": models.OrderPaymentPending}, bson.M{
		"$set":   bson.M{"paymentStatus": models.OrderPaymentPaid, "userId": user.ID, "paidAt": now, "paydunyaToken": invoiceToken, "updatedAt": now},
		"$unset": bson.M{"passwordHash": ""},
	})
	if err != nil || res.ModifiedCount == 0 {
		return err
	}

	remaining := order.ProductPriceXof - order.DepositXof
	go func() {
		loginURL := d.Env.AppURL + "/login?email=" + url.QueryEscape(order.Email)
		html := fmt.Sprintf(`<div style="font-family:sans-serif;padding:20px;color:#1a1a1a;">
  <h2>Acompte recu, bienvenue chez Mahu !</h2>
  <p>Bonjour %s,</p>
  <p>Nous avons bien recu votre acompte de <strong>%d FCFA</strong> pour <strong>%s</strong>.</p>
  <p>Reste a payer a la livraison : <strong>%d FCFA</strong>.</p>
  <p>Votre compte est actif : vous pouvez deja configurer votre profil.</p>
  <p><a href="%s" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;display:inline-block;">Acceder a mon espace</a></p>
</div>`, order.ClientName, order.DepositXof, order.ProductName, remaining, loginURL)
		if err := d.Email.Send(order.Email, "Acompte recu - votre carte Mahu est en preparation", html); err != nil {
			d.logAction(context.Background(), "finalizeCardOrder", models.LogStatusError, "Email client non envoye: "+err.Error(), order.Email)
		}
		summary := fmt.Sprintf("Nouvelle commande (acompte paye)\n\n%s\n%s - %s\n%s\nAcompte: %d FCFA - Reste: %d FCFA\nAdresse: %s",
			order.ProductName, order.ClientName, order.Phone, order.Email, order.DepositXof, remaining, order.DeliveryAddress)
		for _, admin := range d.Env.SuperAdminEmails {
			_ = d.Email.Send(admin, "Nouvelle commande carte Mahu (acompte paye)", strings.ReplaceAll(summary, "\n", "<br>"))
		}
		notify.SendWhatsApp(d.Env, summary)
	}()

	d.logAction(ctx, "finalizeCardOrder", models.LogStatusSuccess, "Acompte confirme pour "+order.Email, order.Email)
	return nil
}

// --- Admin -----------------------------------------------------------------

func (d *Deps) AdminListCardOrders(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	filter := bson.M{}
	if status := r.URL.Query().Get("paymentStatus"); status != "" {
		filter["paymentStatus"] = status
	}
	cursor, err := db.Collection(models.CardOrdersCollection).Find(ctx, filter,
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(500))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	orders := []models.CardOrder{}
	if err := cursor.All(ctx, &orders); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	var paidCount, depositsXof, remainingXof int
	for _, o := range orders {
		if o.PaymentStatus == models.OrderPaymentPending {
			continue
		}
		paidCount++
		depositsXof += o.DepositXof
		if o.PaymentStatus == models.OrderPaymentPaid && o.DeliveryStatus != models.OrderDeliveryCancelled {
			remainingXof += o.ProductPriceXof - o.DepositXof
		}
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"orders": orders,
		"totals": map[string]int{"paidCount": paidCount, "depositsXof": depositsXof, "remainingXof": remainingXof},
	})
}

type updateCardOrderRequest struct {
	DeliveryStatus *string `json:"deliveryStatus"`
	PaymentStatus  *string `json:"paymentStatus"`
	AdminNote      *string `json:"adminNote"`
}

// AdminUpdateCardOrder only moves an order forward after payment (delivery
// progress, balance collected) - it never marks a pending deposit as paid,
// since that would skip account creation in finalizeCardOrder.
func (d *Deps) AdminUpdateCardOrder(w http.ResponseWriter, r *http.Request, id string) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ID invalide")
		return
	}
	var req updateCardOrderRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	set := bson.M{"updatedAt": time.Now()}
	if req.DeliveryStatus != nil {
		switch *req.DeliveryStatus {
		case models.OrderDeliveryToPrepare, models.OrderDeliveryShipped, models.OrderDeliveryDelivered, models.OrderDeliveryCancelled:
			set["deliveryStatus"] = *req.DeliveryStatus
		default:
			httpx.WriteError(w, http.StatusBadRequest, "Statut de livraison invalide")
			return
		}
	}
	filter := bson.M{"_id": objID}
	if req.PaymentStatus != nil {
		if *req.PaymentStatus != models.OrderPaymentPaid && *req.PaymentStatus != models.OrderPaymentFull {
			httpx.WriteError(w, http.StatusBadRequest, "Statut de paiement invalide")
			return
		}
		set["paymentStatus"] = *req.PaymentStatus
		filter["paymentStatus"] = bson.M{"$ne": models.OrderPaymentPending}
	}
	if req.AdminNote != nil {
		set["adminNote"] = strings.TrimSpace(*req.AdminNote)
	}
	res, err := db.Collection(models.CardOrdersCollection).UpdateOne(r.Context(), filter, bson.M{"$set": set})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if res.MatchedCount == 0 {
		httpx.WriteError(w, http.StatusBadRequest, "Commande introuvable ou acompte non encore paye")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (d *Deps) AdminListProducts(w http.ResponseWriter, r *http.Request) {
	products, err := findProducts(r.Context(), bson.M{})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"products": products})
}

type productInput struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	PriceXof    int      `json:"priceXof"`
	PriceIsFrom bool     `json:"priceIsFrom"`
	Category    string   `json:"category"`
	Material    string   `json:"material"`
	ImageURL    string   `json:"imageUrl"`
	Features    []string `json:"features"`
	Active      bool     `json:"active"`
	SortOrder   int      `json:"sortOrder"`
}

func (p *productInput) validate() error {
	p.Name = strings.TrimSpace(p.Name)
	if p.Name == "" || p.PriceXof <= 0 {
		return errors.New("Nom et prix (> 0) sont requis.")
	}
	switch p.Category {
	case models.ProductCategoryNfcCard, models.ProductCategoryRfidFob, models.ProductCategoryRfidCard:
	default:
		return errors.New("Categorie invalide.")
	}
	if p.Features == nil {
		p.Features = []string{}
	}
	return nil
}

func (p productInput) fields() bson.M {
	return bson.M{
		"name": p.Name, "description": strings.TrimSpace(p.Description), "priceXof": p.PriceXof,
		"priceIsFrom": p.PriceIsFrom, "category": p.Category, "material": strings.TrimSpace(p.Material),
		"imageUrl": strings.TrimSpace(p.ImageURL), "features": p.Features, "active": p.Active,
		"sortOrder": p.SortOrder, "updatedAt": time.Now(),
	}
}

func (d *Deps) AdminCreateProduct(w http.ResponseWriter, r *http.Request) {
	var in productInput
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	if err := in.validate(); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	doc := in.fields()
	id := primitive.NewObjectID()
	doc["_id"] = id
	doc["slug"] = slugify(in.Name) + "-" + id.Hex()[18:]
	doc["createdAt"] = time.Now()
	if _, err := db.Collection(models.ProductsCollection).InsertOne(r.Context(), doc); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, map[string]any{"success": true, "_id": id})
}

func (d *Deps) AdminUpdateProduct(w http.ResponseWriter, r *http.Request, id string) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ID invalide")
		return
	}
	var in productInput
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	if err := in.validate(); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	res, err := db.Collection(models.ProductsCollection).UpdateOne(r.Context(), bson.M{"_id": objID}, bson.M{"$set": in.fields()})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if res.MatchedCount == 0 {
		httpx.WriteError(w, http.StatusNotFound, "Produit introuvable")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

// AdminDeleteProduct refuses products already ordered - deactivate them
// instead, so past orders keep pointing at a real product.
func (d *Deps) AdminDeleteProduct(w http.ResponseWriter, r *http.Request, id string) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ID invalide")
		return
	}
	ctx := r.Context()
	if n, err := db.Collection(models.CardOrdersCollection).CountDocuments(ctx, bson.M{"productId": objID}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	} else if n > 0 {
		httpx.WriteError(w, http.StatusConflict, "Ce produit a deja des commandes : desactivez-le plutot.")
		return
	}
	if _, err := db.Collection(models.ProductsCollection).DeleteOne(ctx, bson.M{"_id": objID}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

type adminProspectRow struct {
	ID          primitive.ObjectID `json:"_id"`
	DateCapture time.Time          `json:"dateCapture"`
	Nom         string             `json:"nom"`
	Contact     string             `json:"contact"`
	Message     string             `json:"message"`
	NoteEtoiles int                `json:"noteEtoiles,omitempty"`
	Canal       string             `json:"canal"`
	OwnerEmail  string             `json:"ownerEmail"`
	OwnerSlug   string             `json:"ownerSlug"`
}

// AdminListProspects lists every contact-form message left on any profile,
// with the card holder it was sent to.
func (d *Deps) AdminListProspects(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cursor, err := db.Collection(models.ProspectsCollection).Find(ctx, bson.M{},
		options.Find().SetSort(bson.D{{Key: "dateCapture", Value: -1}}).SetLimit(500))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	var prospects []models.Prospect
	if err := cursor.All(ctx, &prospects); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	ownerIDs := []primitive.ObjectID{}
	seen := map[primitive.ObjectID]bool{}
	for _, p := range prospects {
		if !seen[p.ProfileOwnerID] {
			seen[p.ProfileOwnerID] = true
			ownerIDs = append(ownerIDs, p.ProfileOwnerID)
		}
	}
	owners := map[primitive.ObjectID]models.User{}
	if len(ownerIDs) > 0 {
		userCursor, err := db.Collection(models.UsersCollection).Find(ctx, bson.M{"_id": bson.M{"$in": ownerIDs}},
			options.Find().SetProjection(bson.M{"email": 1, "profileUrl": 1}))
		if err != nil && err != mongo.ErrNoDocuments {
			httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
			return
		}
		var users []models.User
		if err == nil {
			_ = userCursor.All(ctx, &users)
		}
		for _, u := range users {
			owners[u.ID] = u
		}
	}

	rows := make([]adminProspectRow, 0, len(prospects))
	for _, p := range prospects {
		owner := owners[p.ProfileOwnerID]
		rows = append(rows, adminProspectRow{
			ID: p.ID, DateCapture: p.DateCapture, Nom: p.Nom, Contact: p.Contact, Message: p.Message,
			NoteEtoiles: p.NoteEtoiles, Canal: p.Canal, OwnerEmail: owner.Email, OwnerSlug: owner.ProfileURL,
		})
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"prospects": rows})
}
