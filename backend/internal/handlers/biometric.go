package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"math"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"mahu-backend/internal/authutil"
	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/middleware"
	"mahu-backend/internal/models"
)

const faceDescriptorLength = 128
const matchThreshold = 0.5
const maxVerifyAttempts = 5
const verifyWindowSeconds = 10 * 60

func generateCardCode() (string, error) {
	buf := make([]byte, 9)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func cardResponse(card *models.BiometricCard) map[string]any {
	return map[string]any{
		"cardCode":        card.CardCode,
		"enabled":         card.Enabled,
		"profileUsername": card.ProfileUsername,
		"redirectMode":    card.RedirectMode,
	}
}

func getOrCreateCard(ctx context.Context, userID primitive.ObjectID) (*models.BiometricCard, error) {
	col := db.Collection(models.BiometricCardsCollection)

	var card models.BiometricCard
	err := col.FindOne(ctx, bson.M{"userId": userID}).Decode(&card)
	if err == nil {
		return &card, nil
	}
	if err != mongo.ErrNoDocuments {
		return nil, err
	}

	code, err := generateCardCode()
	if err != nil {
		return nil, err
	}
	now := time.Now()
	card = models.BiometricCard{
		ID:           primitive.NewObjectID(),
		UserID:       userID,
		CardCode:     code,
		RedirectMode: "choice",
		Enabled:      false,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if _, err := col.InsertOne(ctx, card); err != nil {
		return nil, err
	}
	return &card, nil
}

func requireUserObjID(w http.ResponseWriter, r *http.Request) (primitive.ObjectID, bool) {
	user, ok := middleware.User(r)
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Missing token")
		return primitive.NilObjectID, false
	}
	id, err := primitive.ObjectIDFromHex(user.Sub())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Missing token")
		return primitive.NilObjectID, false
	}
	return id, true
}

func (d *Deps) GetCard(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserObjID(w, r)
	if !ok {
		return
	}
	card, err := getOrCreateCard(r.Context(), userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, cardResponse(card))
}

// GetCardPublicInfo is public - called from app/c/[cardCode] before the visitor
// has a session, to know whether a "Voir le profil" button can be shown, and
// whether the card owner has chosen to skip the choice screen entirely. Only
// ever exposes the linked username and redirect preference, never the face
// descriptor or enabled state.
func (d *Deps) GetCardPublicInfo(w http.ResponseWriter, r *http.Request, cardCode string) {
	var card models.BiometricCard
	err := db.Collection(models.BiometricCardsCollection).FindOne(r.Context(), bson.M{"cardCode": cardCode}).Decode(&card)

	profileUsername := any(nil)
	redirectMode := "choice"
	if err == nil {
		if card.ProfileUsername != "" {
			profileUsername = card.ProfileUsername
		}
		redirectMode = card.RedirectMode
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"profileUsername": profileUsername,
		"redirectMode":    redirectMode,
	})
}

type profileLinkRequest struct {
	ProfileUsername string `json:"profileUsername"`
}

func (d *Deps) UpdateProfileLink(w http.ResponseWriter, r *http.Request) {
	var req profileLinkRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || len(req.ProfileUsername) == 0 || len(req.ProfileUsername) > 100 {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	userID, ok := requireUserObjID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()
	card, err := getOrCreateCard(ctx, userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	card.ProfileUsername = req.ProfileUsername
	if _, err := db.Collection(models.BiometricCardsCollection).UpdateOne(ctx,
		bson.M{"_id": card.ID},
		bson.M{"$set": bson.M{"profileUsername": card.ProfileUsername, "updatedAt": time.Now()}},
	); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, cardResponse(card))
}

type redirectModeRequest struct {
	RedirectMode string `json:"redirectMode"`
}

func (d *Deps) UpdateRedirectMode(w http.ResponseWriter, r *http.Request) {
	var req redirectModeRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	if req.RedirectMode != "choice" && req.RedirectMode != "profile" && req.RedirectMode != "ai" {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	userID, ok := requireUserObjID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()
	card, err := getOrCreateCard(ctx, userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	if req.RedirectMode == "profile" && card.ProfileUsername == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Lie d'abord un profil avant de choisir ce mode")
		return
	}
	if req.RedirectMode == "ai" && !card.Enabled {
		httpx.WriteError(w, http.StatusBadRequest, "Active d'abord la reconnaissance faciale avant de choisir ce mode")
		return
	}

	card.RedirectMode = req.RedirectMode
	if _, err := db.Collection(models.BiometricCardsCollection).UpdateOne(ctx,
		bson.M{"_id": card.ID},
		bson.M{"$set": bson.M{"redirectMode": card.RedirectMode, "updatedAt": time.Now()}},
	); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, cardResponse(card))
}

type enrollRequest struct {
	Descriptor []float64 `json:"descriptor"`
}

func (d *Deps) EnrollFace(w http.ResponseWriter, r *http.Request) {
	var req enrollRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || len(req.Descriptor) != faceDescriptorLength {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	userID, ok := requireUserObjID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()
	card, err := getOrCreateCard(ctx, userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	card.FaceDescriptor = req.Descriptor
	card.Enabled = true
	if _, err := db.Collection(models.BiometricCardsCollection).UpdateOne(ctx,
		bson.M{"_id": card.ID},
		bson.M{"$set": bson.M{"faceDescriptor": card.FaceDescriptor, "enabled": true, "updatedAt": time.Now()}},
	); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, cardResponse(card))
}

func (d *Deps) DisableCard(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserObjID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()
	card, err := getOrCreateCard(ctx, userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	card.Enabled = false
	// Le mode "ai" n'a plus de sens sans reconnaissance faciale active.
	if card.RedirectMode == "ai" {
		card.RedirectMode = "choice"
	}
	if _, err := db.Collection(models.BiometricCardsCollection).UpdateOne(ctx,
		bson.M{"_id": card.ID},
		bson.M{"$set": bson.M{"enabled": false, "redirectMode": card.RedirectMode, "updatedAt": time.Now()}},
	); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, cardResponse(card))
}

func euclideanDistance(a, b []float64) float64 {
	sum := 0.0
	for i := range a {
		diff := a[i] - b[i]
		sum += diff * diff
	}
	return math.Sqrt(sum)
}

type verifyRequest struct {
	CardCode   string    `json:"cardCode"`
	Descriptor []float64 `json:"descriptor"`
}

func (d *Deps) FaceVerify(w http.ResponseWriter, r *http.Request) {
	var req verifyRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || req.CardCode == "" || len(req.Descriptor) != faceDescriptorLength {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "Invalid payload"})
		return
	}

	ctx := r.Context()
	rateLimitKey := "face-verify:" + req.CardCode
	attempts, err := db.Redis.Incr(ctx, rateLimitKey).Result()
	if err == nil && attempts == 1 {
		db.Redis.Expire(ctx, rateLimitKey, verifyWindowSeconds*time.Second)
	}
	if attempts > maxVerifyAttempts {
		httpx.WriteJSON(w, http.StatusTooManyRequests, map[string]any{"success": false, "error": "Trop de tentatives, reessaie plus tard"})
		return
	}

	var card models.BiometricCard
	err = db.Collection(models.BiometricCardsCollection).FindOne(ctx, bson.M{"cardCode": req.CardCode, "enabled": true}).Decode(&card)
	if err != nil || len(card.FaceDescriptor) != faceDescriptorLength {
		httpx.WriteJSON(w, http.StatusUnauthorized, map[string]any{"success": false, "error": "Carte inconnue ou non activee"})
		return
	}

	if euclideanDistance(card.FaceDescriptor, req.Descriptor) >= matchThreshold {
		httpx.WriteJSON(w, http.StatusUnauthorized, map[string]any{"success": false, "error": "Visage non reconnu"})
		return
	}

	var user models.User
	if err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"_id": card.UserID}).Decode(&user); err != nil {
		httpx.WriteJSON(w, http.StatusUnauthorized, map[string]any{"success": false, "error": "Carte inconnue ou non activee"})
		return
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

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true, "token": token, "role": user.Role})
}
