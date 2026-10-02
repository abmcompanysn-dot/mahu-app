package handlers

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"math/big"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/legacyauth"
	"mahu-backend/internal/models"
)

// MyFocus (Android app, see myfocus-android/) - public endpoints called by
// the phone directly, outside the service key. Abuse guards:
//   - registration: max 3 devices per email per hour, 6-digit code by email;
//   - alerts: HMAC-SHA256 of the raw body with the device secret, timestamp
//     within 10 minutes, verified email only, at most 1 email per 5 minutes.

const (
	myFocusMaxRegistrationsPerHour = 3
	myFocusCodeTTL                 = 15 * time.Minute
	myFocusMaxCodeAttempts         = 5
	myFocusClockSkew               = 10 * time.Minute
	myFocusEmailCooldown           = 5 * time.Minute
)

var myFocusAlertLabels = map[string]string{
	"failed_scans":    "5 badges incorrects d'affilee sur l'ecran de verrouillage",
	"service_off":     "La protection MyFocus a ete desactivee (service d'accessibilite coupe)",
	"admin_disabled":  "Quelqu'un a retire la protection contre la desinstallation de MyFocus",
	"settings_change": "Les reglages de MyFocus ont ete modifies",
}

func randomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func randomDigits(n int) (string, error) {
	var sb strings.Builder
	for i := 0; i < n; i++ {
		d, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		sb.WriteString(d.String())
	}
	return sb.String(), nil
}

func myFocusEmailHTML(title, body string) string {
	return fmt.Sprintf(`<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
  <h2 style="margin:0 0 12px">%s</h2>%s
  <p style="color:#888;font-size:12px;margin-top:24px">MyFocus par Mahu &middot; myfocus.mahu.cards</p>
</div>`, title, body)
}

// MyFocusRegister creates a device for an alert email and sends the
// verification code. Returns the device id and secret the app keeps.
func (d *Deps) MyFocusRegister(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email      string `json:"email"`
		DeviceName string `json:"deviceName"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	email := strings.ToLower(strings.TrimSpace(in.Email))
	if _, err := mail.ParseAddress(email); err != nil || len(email) > 200 {
		httpx.WriteError(w, http.StatusBadRequest, "Adresse email invalide.")
		return
	}
	deviceName := strings.TrimSpace(in.DeviceName)
	if len(deviceName) > 80 {
		deviceName = deviceName[:80]
	}

	ctx := r.Context()
	coll := db.Collection(models.MyFocusDevicesCollection)
	recent, err := coll.CountDocuments(ctx, bson.M{"email": email, "createdAt": bson.M{"$gt": time.Now().Add(-time.Hour)}})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if recent >= myFocusMaxRegistrationsPerHour {
		httpx.WriteError(w, http.StatusTooManyRequests, "Trop de demandes pour cet email. Reessayez dans une heure.")
		return
	}

	deviceID, err := legacyauth.NewUUID()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	secret, err := randomHex(32)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	code, err := randomDigits(6)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	now := time.Now()
	expires := now.Add(myFocusCodeTTL)
	device := models.MyFocusDevice{
		DeviceID: deviceID, Secret: secret, Email: email, DeviceName: deviceName,
		VerifyCode: code, CodeExpiresAt: &expires, CreatedAt: now,
	}
	if _, err := coll.InsertOne(ctx, device); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	body := fmt.Sprintf(`<p>Votre code de verification MyFocus :</p>
<p style="font-size:32px;font-weight:800;letter-spacing:6px;margin:8px 0">%s</p>
<p>Saisissez-le dans l'application (valable 15 minutes). Cette adresse recevra les alertes d'intrusion du telephone &laquo;&nbsp;%s&nbsp;&raquo;.</p>
<p style="color:#666">Vous n'avez rien demande ? Ignorez cet email.</p>`, code, html.EscapeString(orDefault(deviceName, "Android")))
	if err := d.Email.Send(email, "Votre code MyFocus : "+code, myFocusEmailHTML("Verification de votre email", body)); err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "L'email n'a pas pu etre envoye. Reessayez.")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"deviceId": deviceID, "secret": secret})
}

// MyFocusVerify confirms the alert email with the code sent at registration.
func (d *Deps) MyFocusVerify(w http.ResponseWriter, r *http.Request) {
	var in struct {
		DeviceID string `json:"deviceId"`
		Code     string `json:"code"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil || in.DeviceID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	ctx := r.Context()
	coll := db.Collection(models.MyFocusDevicesCollection)
	var device models.MyFocusDevice
	if err := coll.FindOne(ctx, bson.M{"deviceId": in.DeviceID}).Decode(&device); err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Appareil inconnu.")
		return
	}
	if device.Verified {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"verified": true})
		return
	}
	if device.CodeAttempts >= myFocusMaxCodeAttempts || device.CodeExpiresAt == nil || time.Now().After(*device.CodeExpiresAt) {
		httpx.WriteError(w, http.StatusGone, "Code expire. Demandez un nouveau code.")
		return
	}
	if !hmac.Equal([]byte(strings.TrimSpace(in.Code)), []byte(device.VerifyCode)) {
		_, _ = coll.UpdateOne(ctx, bson.M{"_id": device.ID}, bson.M{"$inc": bson.M{"codeAttempts": 1}})
		httpx.WriteError(w, http.StatusBadRequest, "Code incorrect.")
		return
	}
	if _, err := coll.UpdateOne(ctx, bson.M{"_id": device.ID}, bson.M{
		"$set":   bson.M{"verified": true},
		"$unset": bson.M{"verifyCode": "", "codeExpiresAt": ""},
	}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"verified": true})
}

// MyFocusAlert receives a signed intrusion alert from the app and emails the
// verified owner. The signature covers the raw body:
// X-MyFocus-Signature = hex(HMAC-SHA256(secret, body)).
func (d *Deps) MyFocusAlert(w http.ResponseWriter, r *http.Request) {
	raw, err := io.ReadAll(io.LimitReader(r.Body, 4096))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	var in struct {
		DeviceID string `json:"deviceId"`
		Type     string `json:"type"`
		Failures int    `json:"failures"`
		SentAt   int64  `json:"sentAt"` // unix millis
	}
	if err := json.Unmarshal(raw, &in); err != nil || in.DeviceID == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	label, ok := myFocusAlertLabels[in.Type]
	if !ok {
		httpx.WriteError(w, http.StatusBadRequest, "Type d'alerte inconnu")
		return
	}

	ctx := r.Context()
	coll := db.Collection(models.MyFocusDevicesCollection)
	var device models.MyFocusDevice
	if err := coll.FindOne(ctx, bson.M{"deviceId": in.DeviceID}).Decode(&device); err != nil {
		if err == mongo.ErrNoDocuments {
			httpx.WriteError(w, http.StatusUnauthorized, "Signature invalide")
			return
		}
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	mac := hmac.New(sha256.New, []byte(device.Secret))
	mac.Write(raw)
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(strings.ToLower(r.Header.Get("X-MyFocus-Signature")))) {
		httpx.WriteError(w, http.StatusUnauthorized, "Signature invalide")
		return
	}
	sentAt := time.UnixMilli(in.SentAt)
	if d := time.Since(sentAt); d > myFocusClockSkew || d < -myFocusClockSkew {
		httpx.WriteError(w, http.StatusBadRequest, "Alerte perimee")
		return
	}

	now := time.Now()
	set := bson.M{"lastAlertAt": now}
	shouldEmail := device.Verified && (device.LastEmailAt == nil || now.Sub(*device.LastEmailAt) >= myFocusEmailCooldown)
	if shouldEmail {
		set["lastEmailAt"] = now
	}
	if _, err := coll.UpdateOne(ctx, bson.M{"_id": device.ID}, bson.M{"$set": set, "$inc": bson.M{"alertCount": 1}}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	if shouldEmail {
		dakar := time.FixedZone("GMT", 0) // Dakar = UTC toute l'annee
		when := sentAt.In(dakar).Format("02/01/2006 a 15:04")
		detail := ""
		if in.Type == "failed_scans" && in.Failures > 0 {
			detail = fmt.Sprintf("<p>Nombre d'essais rates : <b>%d</b></p>", in.Failures)
		}
		body := fmt.Sprintf(`<p style="font-size:16px"><b>%s</b></p>
<p>Telephone : <b>%s</b><br>Heure : <b>%s</b> (heure de Dakar)</p>%s
<p>Si ce n'etait pas vous, verifiez qui a acces au telephone.</p>`,
			html.EscapeString(label), html.EscapeString(orDefault(device.DeviceName, "Android")), when, detail)
		go func() {
			if err := d.Email.Send(device.Email, "Alerte MyFocus : tentative d'acces", myFocusEmailHTML("&#128680; Alerte MyFocus", body)); err != nil {
				d.logAction(r.Context(), "myfocusAlert", models.LogStatusError, "Email d'alerte non envoye: "+err.Error(), device.Email)
			}
		}()
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true, "emailed": shouldEmail})
}
