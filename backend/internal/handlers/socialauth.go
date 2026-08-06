package handlers

import (
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"mahu-backend/internal/authutil"
	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/models"
)

var allowedProviders = map[string]bool{
	"google.com":   true,
	"facebook.com": true,
}

type socialLoginRequest struct {
	IDToken string `json:"idToken"`
}

func (d *Deps) SocialLogin(w http.ResponseWriter, r *http.Request) {
	var req socialLoginRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || strings.TrimSpace(req.IDToken) == "" {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "Invalid payload"})
		return
	}

	ctx := r.Context()
	decoded, err := d.FirebaseAuth.VerifyIDToken(ctx, req.IDToken)
	if err != nil {
		httpx.WriteJSON(w, http.StatusUnauthorized, map[string]any{"success": false, "error": "Jeton Firebase invalide ou expire"})
		return
	}

	provider := decoded.Firebase.SignInProvider
	if provider == "" || !allowedProviders[provider] {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "Fournisseur de connexion non supporte"})
		return
	}

	email, _ := decoded.Claims["email"].(string)
	if email == "" {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "Aucun email associe a ce compte"})
		return
	}
	email = strings.ToLower(email)
	name, _ := decoded.Claims["name"].(string)
	picture, _ := decoded.Claims["picture"].(string)

	col := db.Collection(models.UsersCollection)

	var user models.User
	err = col.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	newUser := false

	if err == mongo.ErrNoDocuments {
		newUser = true
		now := time.Now()
		user = models.User{
			ID:        primitive.NewObjectID(),
			Email:     email,
			Name:      name,
			PhotoURL:  picture,
			Role:      "Entreprise",
			Providers: []models.Provider{{Provider: provider, ProviderUID: decoded.UID}},
			CreatedAt: now,
			UpdatedAt: now,
		}
		if _, err := col.InsertOne(ctx, user); err != nil {
			httpx.WriteJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": "Erreur serveur"})
			return
		}
	} else if err != nil {
		httpx.WriteJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": "Erreur serveur"})
		return
	} else {
		hasProvider := false
		for _, p := range user.Providers {
			if p.Provider == provider && p.ProviderUID == decoded.UID {
				hasProvider = true
				break
			}
		}
		if !hasProvider {
			user.Providers = append(user.Providers, models.Provider{Provider: provider, ProviderUID: decoded.UID})
			_, err := col.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{
				"providers": user.Providers,
				"updatedAt": time.Now(),
			}})
			if err != nil {
				httpx.WriteJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": "Erreur serveur"})
				return
			}
		}
	}

	if user.Disabled {
		httpx.WriteJSON(w, http.StatusForbidden, map[string]any{"success": false, "error": "Ce compte a ete desactive"})
		return
	}

	token, err := authutil.SignUserToken(d.Env.JWTSecret, user.ID.Hex(), user.Email, user.Role)
	if err != nil {
		httpx.WriteJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": "Erreur serveur"})
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"token":   token,
		"role":    user.Role,
		"newUser": newUser,
	})
}
