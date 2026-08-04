package handlers

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"mahu-backend/internal/authutil"
	"mahu-backend/internal/db"
	"mahu-backend/internal/models"
)

// legacyUser loads the caller's full User document from a JWT, mirroring the
// previous getUserByToken(token) - returns (nil, nil) when no token was
// supplied (public actions), matching `const user = e.parameter.token ? getUserByToken(...) : null`.
func (d *Deps) legacyUser(ctx context.Context, token string) (*models.User, error) {
	if token == "" {
		return nil, nil
	}
	claims, err := authutil.VerifyUserToken(d.Env.JWTSecret, token)
	if err != nil {
		return nil, nil
	}
	userID, err := primitive.ObjectIDFromHex(claims.Sub())
	if err != nil {
		return nil, nil
	}
	var user models.User
	if err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		return nil, nil
	}
	return &user, nil
}

func (d *Deps) logAction(ctx context.Context, action, status, message, userEmail string) {
	entry := models.ActionLog{
		Timestamp: time.Now(),
		Action:    action,
		Statut:    status,
		Message:   message,
		UserEmail: userEmail,
	}
	_, _ = db.Collection(models.ActionLogsCollection).InsertOne(ctx, entry)
}

func str(payload map[string]any, key string) string {
	if v, ok := payload[key].(string); ok {
		return v
	}
	return ""
}

func boolField(payload map[string]any, key string) bool {
	switch v := payload[key].(type) {
	case bool:
		return v
	case string:
		return v == "true" || v == "OUI" || v == "1"
	}
	return false
}

func intField(payload map[string]any, key string, def int) int {
	switch v := payload[key].(type) {
	case float64:
		return int(v)
	case string:
		var n int
		if _, err := fmt.Sscan(v, &n); err == nil {
			return n
		}
	}
	return def
}

func stringSlice(payload map[string]any, key string) []string {
	raw, ok := payload[key].([]any)
	if !ok {
		return nil
	}
	out := make([]string, 0, len(raw))
	for _, v := range raw {
		if s, ok := v.(string); ok {
			out = append(out, s)
		}
	}
	return out
}

// findUserByEmail returns (nil, nil) when not found, matching the many call
// sites in Code.gs that just check `if (!row) return {...}` rather than
// treating a miss as an error.
func findUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func findProfileByUserID(ctx context.Context, userID primitive.ObjectID) (*models.Profile, error) {
	var profile models.Profile
	err := db.Collection(models.ProfilesCollection).FindOne(ctx, bson.M{"userId": userID}).Decode(&profile)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

// profileToMap renders a Profile using the exact legacy AppScript "Profils"
// sheet column names as keys, so lib/api.ts's Profile interface and the rest
// of the existing frontend need zero changes.
func profileToMap(p *models.Profile) map[string]any {
	if p == nil {
		return map[string]any{}
	}
	return map[string]any{
		"ID_Utilisateur":       p.UserID.Hex(),
		"Email":                p.Email,
		"Nom_Complet":          p.NomComplet,
		"Telephone":            p.Telephone,
		"Profession":           p.Profession,
		"Compagnie":            p.Compagnie,
		"Location":             p.Location,
		"URL_Photo":            p.URLPhoto,
		"URL_Couverture":       p.URLCouverture,
		"Liens_Sociaux_JSON":   p.LiensSociauxJSON,
		"Lead_Capture_Actif":   p.LeadCaptureActif,
		"Services_JSON":        p.ServicesJSON,
		"Mise_En_Page":         p.MiseEnPage,
		"Couleur_Theme":        p.CouleurTheme,
		"Cacher_Marque":        p.CacherMarque,
		"Langue":               p.Langue,
		"Redirection_Site_Web": p.RedirectionSiteWeb,
	}
}

func userToMap(u *models.User) map[string]any {
	if u == nil {
		return map[string]any{}
	}
	return map[string]any{
		"ID_Unique":          u.ID.Hex(),
		"Email":              u.Email,
		"Role":               u.Role,
		"URL_Profil":         u.ProfileURL,
		"URL_Profil_2":       u.ProfileURL2,
		"URL_Profil_3":       u.ProfileURL3,
		"Onboarding_Status":  u.OnboardingStatus,
		"ID_Entreprise":      u.EnterpriseID,
	}
}

type profileOwnerRef struct {
	ID    primitive.ObjectID
	Email string
}

// findProfileOwnerByURL finds the user owning a given public profile slug
// (any of URL_Profil / URL_Profil_2 / URL_Profil_3), mirroring
// findProfileOwnerByUrl() in Code.gs.
func findProfileOwnerByURL(ctx context.Context, profileURL string) (*profileOwnerRef, error) {
	slug := strings.ToLower(strings.TrimSpace(profileURL))
	var user models.User
	err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"$or": []bson.M{
		{"profileUrl": slug}, {"profileUrl2": slug}, {"profileUrl3": slug},
	}}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &profileOwnerRef{ID: user.ID, Email: user.Email}, nil
}

func emailPrefix(email string) string {
	for i, c := range email {
		if c == '@' {
			return email[:i]
		}
	}
	return email
}
