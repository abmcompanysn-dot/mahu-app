package handlers

import (
	"net/http"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"

	"mahu-backend/internal/authutil"
	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/models"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (d *Deps) AdminLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || !strings.Contains(req.Email, "@") || len(req.Password) < 8 {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	ctx := r.Context()
	col := db.Collection(models.AdminUsersCollection)

	var admin models.AdminUser
	err := col.FindOne(ctx, bson.M{"email": req.Email}).Decode(&admin)
	if err == mongo.ErrNoDocuments {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	} else if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.Password)) != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	if admin.TOTPEnabled {
		pendingToken, err := authutil.SignAdminPendingToken(d.Env.JWTSecret, admin.ID.Hex(), admin.Email)
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"twoFactorRequired": true,
			"pendingToken":      pendingToken,
		})
		return
	}

	token, err := authutil.SignAdminToken(d.Env.JWTSecret, admin.ID.Hex(), admin.Email, admin.Role)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"admin": map[string]any{
			"id":    admin.ID.Hex(),
			"email": admin.Email,
			"name":  admin.Name,
			"role":  admin.Role,
		},
	})
}
