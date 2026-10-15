package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/mail"
	"regexp"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"mahu-backend/internal/authutil"
	"mahu-backend/internal/db"
	"mahu-backend/internal/legacyauth"
	"mahu-backend/internal/models"
	"mahu-backend/internal/notify"
)

// Activating a profile address that doesn't exist yet: a visitor who opens
// /p/<adresse> (a QR code or link already printed) is offered to activate it,
// and the address is kept through whichever signup path follows (free card
// code, paid card code or deposit order) - see createLegacyAccount.

var profileSlugRegexp = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{1,38}[a-z0-9]$`)

// Addresses that would be confusing on a public card or collide with a page.
var reservedProfileSlugs = map[string]bool{
	"admin": true, "api": true, "app": true, "ai": true, "aide": true, "avis": true, "c": true, "contact": true,
	"dashboard": true, "help": true, "login": true, "logout": true, "mahu": true, "mahucards": true, "null": true,
	"onboarding": true, "p": true, "register": true, "settings": true, "support": true, "undefined": true, "www": true,
}

func normalizeProfileSlug(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// profileSlugProblem returns "" when the address can be given to a new
// account, otherwise the reason shown to the visitor.
func profileSlugProblem(ctx context.Context, slug string) (string, error) {
	if !profileSlugRegexp.MatchString(slug) || strings.Contains(slug, "..") {
		return "Adresse invalide : de 3 a 40 caracteres, lettres, chiffres, point, tiret ou tiret bas.", nil
	}
	if reservedProfileSlugs[slug] {
		return "Cette adresse est reservee.", nil
	}
	owner, err := findProfileOwnerByURL(ctx, slug)
	if err != nil {
		return "", err
	}
	if owner != nil {
		return "Cette adresse est deja utilisee.", nil
	}
	return "", nil
}

// legacyCheckProfileAvailability is the public "checkProfileAvailability"
// action used by the profile page and the signup form.
func (d *Deps) legacyCheckProfileAvailability(ctx context.Context, profileURL string) (map[string]any, error) {
	slug := normalizeProfileSlug(profileURL)
	problem, err := profileSlugProblem(ctx, slug)
	if err != nil {
		return nil, err
	}
	return map[string]any{"success": true, "profileUrl": slug, "available": problem == "",
		"blankCard": problem == "" && isBlankCardSlug(slug), "reason": problem}, nil
}

// Blank cards: cards sold without an account, each printed with its own
// address (mahu-noom-j-6-jeudi-1478). Holding the card is the proof of
// purchase, so - as in v1's quickRegisterAndActivate - opening that address
// leads straight to the activation form, with no code and no payment. Other
// free addresses still need a card code or a deposit order.
var blankCardSlugRegexp = regexp.MustCompile(`^mahu-[a-z0-9-]+-[0-9]{3,6}$`)

func isBlankCardSlug(slug string) bool {
	return blankCardSlugRegexp.MatchString(slug)
}

// legacyActivateBlankCard is the public "activateBlankCard" action: creates
// the account and its filled-in profile on the card's address, then logs the
// user in.
func (d *Deps) legacyActivateBlankCard(ctx context.Context, payload map[string]any) (map[string]any, error) {
	slug := normalizeProfileSlug(str(payload, "profileUrl"))
	email := strings.ToLower(strings.TrimSpace(str(payload, "email")))
	password := str(payload, "password")
	name := strings.TrimSpace(str(payload, "nomComplet"))
	phone := strings.TrimSpace(str(payload, "telephone"))

	if !isBlankCardSlug(slug) {
		return map[string]any{"success": false, "error": "Cette adresse n'est pas celle d'une carte Mahu a activer."}, nil
	}
	if name == "" || email == "" || len(password) < 6 {
		return map[string]any{"success": false, "error": "Nom, e-mail et mot de passe (6 caracteres minimum) sont requis."}, nil
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return map[string]any{"success": false, "error": "Adresse e-mail invalide."}, nil
	}
	problem, err := profileSlugProblem(ctx, slug)
	if err != nil {
		return nil, err
	}
	if problem != "" {
		return map[string]any{"success": false, "error": "Cette carte est deja activee. Connectez-vous pour la gerer."}, nil
	}
	existing, err := findUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return map[string]any{"success": false, "error": signupEmailRefused}, nil
	}

	hash, err := legacyauth.HashPassword(password)
	if err != nil {
		return nil, err
	}
	user, err := createLegacyAccount(ctx, email, hash, "", name, phone, slug)
	if err != nil {
		return nil, err
	}
	if user.ProfileURL != slug {
		// Activated by someone else in the same instant: the account exists on
		// a generated address, an admin can move it by hand.
		d.logAction(ctx, "activateBlankCard", models.LogStatusError, "Adresse "+slug+" prise pendant l'activation", email)
	}
	set := bson.M{"updatedAt": time.Now()}
	if v := strings.TrimSpace(str(payload, "profession")); v != "" {
		set["profession"] = v
	}
	if v := strings.TrimSpace(str(payload, "compagnie")); v != "" {
		set["compagnie"] = v
	}
	if str(payload, "leadCapture") == "NON" {
		set["leadCaptureActif"] = "NON"
	}
	if links := blankCardLinks(payload["liensSociaux"]); len(links) > 0 {
		if b, err := json.Marshal(links); err == nil {
			set["liensSociauxJson"] = string(b)
		}
	}
	if _, err := db.Collection(models.ProfilesCollection).UpdateOne(ctx, bson.M{"userId": user.ID}, bson.M{"$set": set}); err != nil {
		return nil, err
	}
	_ = db.InvalidateCache(ctx, profileCacheKey(user.ProfileURL))

	if err := d.requestBlankCardReview(ctx, user, [][2]string{
		{"Nom", name}, {"Poste", str(payload, "profession")}, {"Entreprise", str(payload, "compagnie")},
		{"Telephone", phone}, {"E-mail", email}, {"Adresse", d.Env.AppURL + "/p/" + user.ProfileURL},
	}); err != nil {
		return nil, err
	}

	token, err := authutil.SignUserToken(d.Env.JWTSecret, user.ID.Hex(), user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	go func() {
		loginURL := d.Env.AppURL + "/login"
		if err := d.Email.Send(email, "Bienvenue sur Mahu !", welcomeEmailHTML(loginURL)); err != nil {
			d.logAction(context.Background(), "activateBlankCard", models.LogStatusError, "Erreur envoi email bienvenue: "+err.Error(), email)
		}
		notify.SendWhatsApp(d.Env, fmt.Sprintf("Carte vierge activee, a confirmer par e-mail sous 2 h\n\n%s - %s\n%s\nAdresse : %s/p/%s", name, phone, email, d.Env.AppURL, user.ProfileURL))
	}()

	d.logAction(ctx, "activateBlankCard", models.LogStatusSuccess, fmt.Sprintf("Carte activee pour %s (slug: %s)", email, user.ProfileURL), email)
	return map[string]any{"success": true, "token": token, "role": user.Role, "profileUrl": user.ProfileURL}, nil
}

// blankCardLinks keeps the form's social links in the profile's
// Liens_Sociaux_JSON shape ({type, url}), known types only.
func blankCardLinks(raw any) []map[string]string {
	known := map[string]bool{"whatsapp": true, "linkedin": true, "instagram": true, "facebook": true, "tiktok": true, "website": true}
	items, _ := raw.([]any)
	var out []map[string]string
	for _, it := range items {
		m, _ := it.(map[string]any)
		t, _ := m["type"].(string)
		u, _ := m["url"].(string)
		u = strings.TrimSpace(u)
		if known[t] && u != "" && len(u) <= 300 && len(out) < 10 {
			out = append(out, map[string]string{"type": t, "url": u})
		}
	}
	return out
}
