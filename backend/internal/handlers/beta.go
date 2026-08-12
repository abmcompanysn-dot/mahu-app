package handlers

import (
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/models"
)

const betaMaxPerCountry = 10

type betaSignupRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Phone   string `json:"phone"`
	Address string `json:"address"`
	Country string `json:"country"`
}

// SubmitBetaSignup is fully public (no auth, no service key - called
// directly from the standalone beta-carte-ai static page on its own
// subdomain) and caps entries at betaMaxPerCountry per country.
func (d *Deps) SubmitBetaSignup(w http.ResponseWriter, r *http.Request) {
	var req betaSignupRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	name := strings.TrimSpace(req.Name)
	email := strings.TrimSpace(req.Email)
	phone := strings.TrimSpace(req.Phone)
	address := strings.TrimSpace(req.Address)
	country := strings.TrimSpace(req.Country)
	if name == "" || email == "" || phone == "" || address == "" || country == "" ||
		len(name) > 200 || len(email) > 200 || len(phone) > 50 || len(address) > 300 || len(country) > 100 {
		httpx.WriteError(w, http.StatusBadRequest, "Merci de remplir tous les champs")
		return
	}

	ctx := r.Context()
	count, err := db.Collection(models.BetaSignupsCollection).CountDocuments(ctx, bson.M{"country": country})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if count >= betaMaxPerCountry {
		httpx.WriteError(w, http.StatusConflict, "Les "+itoa(betaMaxPerCountry)+" places pour "+country+" sont deja prises. Merci de votre interet !")
		return
	}

	signup := models.BetaSignup{
		ID:        primitive.NewObjectID(),
		Name:      name,
		Email:     email,
		Phone:     phone,
		Address:   address,
		Country:   country,
		CreatedAt: time.Now(),
	}
	if _, err := db.Collection(models.BetaSignupsCollection).InsertOne(ctx, signup); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	go sendBetaSignupEmails(d, signup, count+1)

	httpx.WriteJSON(w, http.StatusCreated, map[string]any{"success": true})
}

// GetBetaSignupCount is public - powers the "X people already signed up"
// counter on the beta page.
func (d *Deps) GetBetaSignupCount(w http.ResponseWriter, r *http.Request) {
	count, err := db.Collection(models.BetaSignupsCollection).CountDocuments(r.Context(), bson.M{})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true, "count": count})
}

// ListBetaSignups is admin-only, most recent first.
func (d *Deps) ListBetaSignups(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cursor, err := db.Collection(models.BetaSignupsCollection).Find(ctx, bson.M{},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(1000))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	var signups []models.BetaSignup
	if err := cursor.All(ctx, &signups); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if signups == nil {
		signups = []models.BetaSignup{}
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"signups": signups})
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	digits := []byte{}
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}

func sendBetaSignupEmails(d *Deps, signup models.BetaSignup, rank int64) {
	subject := "Votre demande pour la beta de la carte Mahu IA - " + signup.Name
	htmlBody := `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eeeeee; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
      <div style="background-color: #06070b; padding: 34px 20px; text-align: center;">
        <span style="color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0.08em;">AI MAHU</span>
      </div>
      <div style="padding: 40px 32px; color: #1a1a1a; line-height: 1.8; font-size: 16px;">
        <h2 style="color: #000000; margin-top: 0; font-weight: 300; letter-spacing: 1px; text-transform: uppercase; font-size: 22px; text-align: center; margin-bottom: 8px;">Demande bien recue</h2>
        <p style="text-align: center; color: #555; margin-top: 0; margin-bottom: 30px;">Merci, ` + signup.Name + ` 👋</p>
        <p>Votre demande de participation a la beta de la carte Mahu avec intelligence artificielle a bien ete enregistree pour <strong>` + signup.Country + `</strong>.</p>
        <div style="background-color: #f9f9f9; padding: 20px 22px; border-left: 4px solid #007aff; margin: 28px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-size: 14px; color: #444;">C'est une <strong>beta payante</strong>, a places limitees (10 par pays). Notre equipe vous contactera personnellement pour la suite : confirmation, paiement, puis expedition de votre carte.</p>
        </div>
        <div style="text-align: center; margin: 36px 0 8px;">
          <a href="mailto:contact@mahu.cards" style="background-color: #000000; color: #ffffff; padding: 15px 30px; text-decoration: none; font-weight: 500; font-size: 14px; display: inline-block; letter-spacing: 1px; text-transform: uppercase; border-radius: 4px;">Nous contacter</a>
        </div>
        <p style="text-align: center; font-size: 13px; color: #999;">contact@mahu.cards</p>
        <p style="margin-top: 30px;">A tres bientot,<br>L'equipe Mahu</p>
      </div>
      <div style="background-color: #fcfcfc; padding: 20px; text-align: center; font-size: 11px; color: #999999; border-top: 1px solid #eeeeee;">
        MAHU DIGITAL SYSTEM - Medina Rue 13 Angle 12, Dakar, Senegal<br>
        NINEA 012834182 | RCCM SN.DKR.2026.A.6465
      </div>
    </div>`
	if err := d.Email.Send(signup.Email, subject, htmlBody); err != nil {
		// Best-effort - the signup itself already succeeded and was stored.
		return
	}

	adminSubject := "Nouvelle inscription beta carte IA (" + itoa(int(rank)) + "/" + itoa(betaMaxPerCountry) + " - " + signup.Country + ")"
	adminBody := signup.Name + "\nEmail: " + signup.Email + "\nTelephone: " + signup.Phone + "\nAdresse: " + signup.Address + "\nPays: " + signup.Country
	_ = d.Email.Send("abmcompanysn@gmail.com", adminSubject, "<pre>"+adminBody+"</pre>")
}
