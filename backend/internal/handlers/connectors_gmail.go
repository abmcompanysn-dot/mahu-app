package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/legacyauth"
	"mahu-backend/internal/models"
)

// Gmail connector - NEW, UNVERIFIED (no Google Cloud OAuth client available
// while building this - see config.GoogleOAuthClientID). Lets a Mahu user
// link their own Gmail account so Mahu can send email as them (e.g. a
// one-click follow-up to a captured lead), rather than through the generic
// SMTP sender used for platform notifications. First of the "connecteurs
// Mahu" - modeled after Claude's own Connectors (Gmail, Canva, ...): the
// user authorizes the link themselves and can revoke it at any time.
//
// OAuth CSRF protection: the `state` value is a random, single-use token
// stored server-side in Redis (mapped to the initiating user, 10 min TTL) -
// NOT a signed JWT of the user ID, which would let a leaked session token be
// replayed to link an attacker's Gmail to a victim's Mahu account.

const gmailScope = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email"
const gmailStateTTLSeconds = 600
const gmailStateKeyPrefix = "gmail_oauth_state:"

func (d *Deps) gmailConfigured() bool {
	return d.Env.GoogleOAuthClientID != "" && d.Env.GoogleOAuthClientSecret != "" && d.Env.GoogleOAuthRedirectURL != ""
}

func (d *Deps) GmailAuthorize(w http.ResponseWriter, r *http.Request) {
	if !d.gmailConfigured() {
		httpx.WriteError(w, http.StatusServiceUnavailable, "Le connecteur Gmail n'est pas configure")
		return
	}

	userID, ok := requireUserObjID(w, r)
	if !ok {
		return
	}

	state, err := legacyauth.NewUUID()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	ctx := r.Context()
	if err := db.SetCache(ctx, gmailStateKeyPrefix+state, userID.Hex(), gmailStateTTLSeconds); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	params := url.Values{}
	params.Set("client_id", d.Env.GoogleOAuthClientID)
	params.Set("redirect_uri", d.Env.GoogleOAuthRedirectURL)
	params.Set("response_type", "code")
	params.Set("scope", gmailScope)
	params.Set("access_type", "offline")
	params.Set("prompt", "consent")
	params.Set("state", state)

	authURL := "https://accounts.google.com/o/oauth2/v2/auth?" + params.Encode()
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"authUrl": authURL})
}

type googleTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Error        string `json:"error"`
	ErrorDesc    string `json:"error_description"`
}

type googleUserInfo struct {
	Email string `json:"email"`
}

func exchangeGoogleCode(clientID, clientSecret, redirectURL, code string) (*googleTokenResponse, error) {
	form := url.Values{}
	form.Set("client_id", clientID)
	form.Set("client_secret", clientSecret)
	form.Set("redirect_uri", redirectURL)
	form.Set("code", code)
	form.Set("grant_type", "authorization_code")

	resp, err := http.Post("https://oauth2.googleapis.com/token", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var token googleTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil {
		return nil, err
	}
	if token.Error != "" {
		return nil, fmt.Errorf("%s: %s", token.Error, token.ErrorDesc)
	}
	return &token, nil
}

func refreshGoogleAccessToken(clientID, clientSecret, refreshToken string) (string, error) {
	form := url.Values{}
	form.Set("client_id", clientID)
	form.Set("client_secret", clientSecret)
	form.Set("refresh_token", refreshToken)
	form.Set("grant_type", "refresh_token")

	resp, err := http.Post("https://oauth2.googleapis.com/token", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var token googleTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil {
		return "", err
	}
	if token.Error != "" {
		return "", fmt.Errorf("%s: %s", token.Error, token.ErrorDesc)
	}
	return token.AccessToken, nil
}

// GmailCallback is PUBLIC (Google redirects the user's browser here directly,
// with no Mahu session) - see main.go, mounted ahead of requireServiceKey.
func (d *Deps) GmailCallback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	settingsURL := d.Env.AppURL + "/dashboard/settings"

	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	if code == "" || state == "" {
		http.Redirect(w, r, settingsURL+"?gmail=error", http.StatusFound)
		return
	}

	userIDHex, err := db.GetCache[string](ctx, gmailStateKeyPrefix+state)
	if err != nil || userIDHex == nil {
		http.Redirect(w, r, settingsURL+"?gmail=error", http.StatusFound)
		return
	}
	_ = db.InvalidateCache(ctx, gmailStateKeyPrefix+state) // single-use

	userID, err := primitive.ObjectIDFromHex(*userIDHex)
	if err != nil {
		http.Redirect(w, r, settingsURL+"?gmail=error", http.StatusFound)
		return
	}

	token, err := exchangeGoogleCode(d.Env.GoogleOAuthClientID, d.Env.GoogleOAuthClientSecret, d.Env.GoogleOAuthRedirectURL, code)
	if err != nil || token.RefreshToken == "" {
		http.Redirect(w, r, settingsURL+"?gmail=error", http.StatusFound)
		return
	}

	userInfoReq, _ := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	userInfoReq.Header.Set("Authorization", "Bearer "+token.AccessToken)
	userInfoResp, err := http.DefaultClient.Do(userInfoReq)
	if err != nil {
		http.Redirect(w, r, settingsURL+"?gmail=error", http.StatusFound)
		return
	}
	defer userInfoResp.Body.Close()

	var info googleUserInfo
	if err := json.NewDecoder(userInfoResp.Body).Decode(&info); err != nil || info.Email == "" {
		http.Redirect(w, r, settingsURL+"?gmail=error", http.StatusFound)
		return
	}

	now := time.Now()
	_, err = db.Collection(models.GmailConnectionsCollection).UpdateOne(ctx,
		bson.M{"userId": userID},
		bson.M{"$set": bson.M{
			"googleEmail":  info.Email,
			"refreshToken": token.RefreshToken,
			"updatedAt":    now,
		}, "$setOnInsert": bson.M{"userId": userID, "connectedAt": now}},
		options.Update().SetUpsert(true),
	)
	if err != nil {
		http.Redirect(w, r, settingsURL+"?gmail=error", http.StatusFound)
		return
	}

	http.Redirect(w, r, settingsURL+"?gmail=connected", http.StatusFound)
}

func (d *Deps) GmailStatus(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserObjID(w, r)
	if !ok {
		return
	}

	var conn models.GmailConnection
	err := db.Collection(models.GmailConnectionsCollection).FindOne(r.Context(), bson.M{"userId": userID}).Decode(&conn)
	if err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"connected": false})
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"connected": true, "email": conn.GoogleEmail})
}

func (d *Deps) GmailDisconnect(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserObjID(w, r)
	if !ok {
		return
	}
	_, err := db.Collection(models.GmailConnectionsCollection).DeleteOne(r.Context(), bson.M{"userId": userID})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

type gmailSendRequest struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

func (d *Deps) GmailSend(w http.ResponseWriter, r *http.Request) {
	var req gmailSendRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || req.To == "" || req.Subject == "" || req.Body == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	userID, ok := requireUserObjID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()

	var conn models.GmailConnection
	if err := db.Collection(models.GmailConnectionsCollection).FindOne(ctx, bson.M{"userId": userID}).Decode(&conn); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Gmail n'est pas connecte")
		return
	}

	accessToken, err := refreshGoogleAccessToken(d.Env.GoogleOAuthClientID, d.Env.GoogleOAuthClientSecret, conn.RefreshToken)
	if err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "Impossible de rafraichir l'acces Gmail - reconnecte ton compte")
		return
	}

	mime := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		conn.GoogleEmail, req.To, req.Subject, req.Body)
	raw := base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString([]byte(mime))

	payload, _ := json.Marshal(map[string]string{"raw": raw})
	sendReq, _ := http.NewRequest("POST", "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", bytes.NewReader(payload))
	sendReq.Header.Set("Content-Type", "application/json")
	sendReq.Header.Set("Authorization", "Bearer "+accessToken)

	sendResp, err := http.DefaultClient.Do(sendReq)
	if err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "Gmail injoignable")
		return
	}
	defer sendResp.Body.Close()

	if sendResp.StatusCode < 200 || sendResp.StatusCode >= 300 {
		httpx.WriteError(w, http.StatusBadGateway, "Echec de l'envoi via Gmail")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}
