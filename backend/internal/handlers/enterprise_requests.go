package handlers

import (
	"fmt"
	"html"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/models"
	"mahu-backend/internal/notify"
)

type enterpriseRequestInput struct {
	Company       string `json:"company"`
	ContactName   string `json:"contactName"`
	Email         string `json:"email"`
	Phone         string `json:"phone"`
	EmployeeCount string `json:"employeeCount"`
	Message       string `json:"message"`
}

func clip(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) > max {
		return s[:max]
	}
	return s
}

// SubmitEnterpriseRequest stores a quote request and alerts the super-admins
// by email and WhatsApp.
func (d *Deps) SubmitEnterpriseRequest(w http.ResponseWriter, r *http.Request) {
	var in enterpriseRequestInput
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	now := time.Now()
	req := models.EnterpriseRequest{
		ID:            primitive.NewObjectID(),
		Company:       clip(in.Company, 200),
		ContactName:   clip(in.ContactName, 200),
		Email:         strings.ToLower(clip(in.Email, 200)),
		Phone:         clip(in.Phone, 50),
		EmployeeCount: clip(in.EmployeeCount, 50),
		Message:       clip(in.Message, 5000),
		Status:        models.EnterpriseRequestNew,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if _, err := mail.ParseAddress(req.Email); err != nil || req.Company == "" || req.ContactName == "" || req.Phone == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Entreprise, nom, email et telephone sont requis.")
		return
	}
	if _, err := db.Collection(models.EnterpriseRequestsCollection).InsertOne(r.Context(), req); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	go func() {
		summary := fmt.Sprintf("Nouvelle demande entreprise\n\n%s\n%s - %s\n%s\nEffectif: %s\n\n%s",
			req.Company, req.ContactName, req.Phone, req.Email, req.EmployeeCount, req.Message)
		htmlBody := strings.ReplaceAll(html.EscapeString(summary), "\n", "<br>")
		for _, admin := range d.Env.SuperAdminEmails {
			_ = d.Email.Send(admin, "Nouvelle demande entreprise - "+req.Company, htmlBody)
		}
		notify.SendWhatsApp(d.Env, summary)
	}()

	httpx.WriteJSON(w, http.StatusCreated, map[string]any{"success": true})
}

func (d *Deps) AdminListEnterpriseRequests(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cursor, err := db.Collection(models.EnterpriseRequestsCollection).Find(ctx, bson.M{},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(500))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	requests := []models.EnterpriseRequest{}
	if err := cursor.All(ctx, &requests); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"requests": requests})
}

func (d *Deps) AdminUpdateEnterpriseRequest(w http.ResponseWriter, r *http.Request, id string) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ID invalide")
		return
	}
	var in struct {
		Status string `json:"status"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil || (in.Status != models.EnterpriseRequestNew && in.Status != models.EnterpriseRequestHandled) {
		httpx.WriteError(w, http.StatusBadRequest, "Statut invalide")
		return
	}
	res, err := db.Collection(models.EnterpriseRequestsCollection).UpdateOne(r.Context(), bson.M{"_id": objID},
		bson.M{"$set": bson.M{"status": in.Status, "updatedAt": time.Now()}})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if res.MatchedCount == 0 {
		httpx.WriteError(w, http.StatusNotFound, "Demande introuvable")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}
