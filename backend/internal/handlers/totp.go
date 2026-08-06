package handlers

import (
	"net/http"

	"github.com/pquerna/otp/totp"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"mahu-backend/internal/authutil"
	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/middleware"
	"mahu-backend/internal/models"
)

const totpIssuer = "Mahu Admin"

type verify2FARequest struct {
	PendingToken string `json:"pendingToken"`
	Code         string `json:"code"`
}

// Verify2FA is step 2 of admin login: exchanges a pending token (proof the
// password was correct) plus a TOTP code for the real admin session token.
func (d *Deps) Verify2FA(w http.ResponseWriter, r *http.Request) {
	var req verify2FARequest
	if err := httpx.DecodeJSON(r, &req); err != nil || req.PendingToken == "" || req.Code == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	pending, err := authutil.VerifyAdminPendingToken(d.Env.JWTSecret, req.PendingToken)
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid or expired token")
		return
	}

	adminID, err := primitive.ObjectIDFromHex(pending.Sub())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	ctx := r.Context()
	var admin models.AdminUser
	err = db.Collection(models.AdminUsersCollection).FindOne(ctx, bson.M{"_id": adminID}).Decode(&admin)
	if err == mongo.ErrNoDocuments {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid token")
		return
	} else if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	if !admin.TOTPEnabled || !totp.Validate(req.Code, admin.TOTPSecret) {
		httpx.WriteError(w, http.StatusUnauthorized, "Code invalide")
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

// Setup2FA generates a new TOTP secret for the logged-in admin and stores it
// un-enabled - enrollment only completes once Confirm2FA validates a code
// generated from it, so a secret alone never grants 2FA-bypass.
func (d *Deps) Setup2FA(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.Admin(r)
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	adminID, err := primitive.ObjectIDFromHex(claims.Sub())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      totpIssuer,
		AccountName: claims.Email,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	ctx := r.Context()
	_, err = db.Collection(models.AdminUsersCollection).UpdateOne(ctx, bson.M{"_id": adminID}, bson.M{"$set": bson.M{
		"totpSecret":  key.Secret(),
		"totpEnabled": false,
	}})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"secret":     key.Secret(),
		"otpauthUrl": key.URL(),
	})
}

type confirm2FARequest struct {
	Code string `json:"code"`
}

// Confirm2FA completes enrollment: the admin must prove they scanned the QR
// correctly by submitting one valid code before 2FA becomes required.
func (d *Deps) Confirm2FA(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.Admin(r)
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	adminID, err := primitive.ObjectIDFromHex(claims.Sub())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	var req confirm2FARequest
	if err := httpx.DecodeJSON(r, &req); err != nil || req.Code == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	ctx := r.Context()
	var admin models.AdminUser
	err = db.Collection(models.AdminUsersCollection).FindOne(ctx, bson.M{"_id": adminID}).Decode(&admin)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	if admin.TOTPSecret == "" || !totp.Validate(req.Code, admin.TOTPSecret) {
		httpx.WriteError(w, http.StatusUnauthorized, "Code invalide")
		return
	}

	_, err = db.Collection(models.AdminUsersCollection).UpdateOne(ctx, bson.M{"_id": adminID}, bson.M{"$set": bson.M{
		"totpEnabled": true,
	}})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

// Disable2FA turns 2FA back off for the logged-in admin (they're already
// authenticated via RequireAdminAuth, which today only ever issues a token
// after either a plain password check or a completed 2FA challenge).
func (d *Deps) Disable2FA(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.Admin(r)
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	adminID, err := primitive.ObjectIDFromHex(claims.Sub())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	ctx := r.Context()
	_, err = db.Collection(models.AdminUsersCollection).UpdateOne(ctx, bson.M{"_id": adminID}, bson.M{"$set": bson.M{
		"totpSecret":  "",
		"totpEnabled": false,
	}})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}
