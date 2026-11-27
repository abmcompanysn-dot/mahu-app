package handlers

import (
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/legacyauth"
	"mahu-backend/internal/models"
)

// AdminResetPasswordToDefault puts a client account back on the default
// password printed in the delivery guide (defaultClientPassword), stored
// salted like any other password, and forces a new password at the next
// login (mustChangePassword). Used when MAHU creates or hands over an
// account for a client, or when a client is locked out.
func (d *Deps) AdminResetPasswordToDefault(w http.ResponseWriter, r *http.Request, userIDHex string) {
	userID, err := primitive.ObjectIDFromHex(userIDHex)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid user id")
		return
	}
	stored, err := legacyauth.HashPassword(defaultClientPassword)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	ctx := r.Context()
	res, err := db.Collection(models.UsersCollection).UpdateOne(ctx, bson.M{"_id": userID}, bson.M{
		"$set":   bson.M{"passwordHash": stored, "mustChangePassword": true, "sessionsValidAfter": models.RevokeSessionsNow(), "updatedAt": time.Now()},
		"$unset": bson.M{"resetToken": "", "resetTokenExpiration": ""},
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if res.MatchedCount == 0 {
		httpx.WriteError(w, http.StatusNotFound, "Utilisateur introuvable")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}
