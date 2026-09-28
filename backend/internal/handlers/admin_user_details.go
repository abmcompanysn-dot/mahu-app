package handlers

import (
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/config"
	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/models"
)

type adminProfileView struct {
	NomComplet       string `json:"nomComplet"`
	Telephone        string `json:"telephone"`
	Profession       string `json:"profession"`
	Compagnie        string `json:"compagnie"`
	Location         string `json:"location"`
	URLPhoto         string `json:"urlPhoto"`
	LeadCaptureActif string `json:"leadCaptureActif"`
	LiensSociauxJSON string `json:"liensSociauxJson"`
}

type adminCardView struct {
	CodeCarte      string     `json:"codeCarte"`
	Statut         string     `json:"statut"`
	Vendeur        string     `json:"vendeur,omitempty"`
	DateActivation *time.Time `json:"dateActivation,omitempty"`
}

type adminProspectView struct {
	DateCapture time.Time `json:"dateCapture"`
	Nom         string    `json:"nom"`
	Contact     string    `json:"contact"`
	Message     string    `json:"message"`
}

// AdminGetUserDetails gathers everything known about one user for the admin
// user sheet: account, public profile, cards, orders, plan, received
// messages and profile views.
func (d *Deps) AdminGetUserDetails(w http.ResponseWriter, r *http.Request, id string) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ID invalide")
		return
	}
	ctx := r.Context()

	var user models.User
	if err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"_id": objID}).Decode(&user); err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Utilisateur introuvable")
		return
	}

	var profile *adminProfileView
	var p models.Profile
	if err := db.Collection(models.ProfilesCollection).FindOne(ctx, bson.M{"userId": objID}).Decode(&p); err == nil {
		profile = &adminProfileView{
			NomComplet: p.NomComplet, Telephone: p.Telephone, Profession: p.Profession, Compagnie: p.Compagnie,
			Location: p.Location, URLPhoto: p.URLPhoto, LeadCaptureActif: p.LeadCaptureActif, LiensSociauxJSON: p.LiensSociauxJSON,
		}
	} else if err != mongo.ErrNoDocuments {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	cards := []adminCardView{}
	if cursor, err := db.Collection(models.PhysicalCardsCollection).Find(ctx, bson.M{"emailProprietaire": user.Email}); err == nil {
		var list []models.PhysicalCard
		_ = cursor.All(ctx, &list)
		for _, c := range list {
			cards = append(cards, adminCardView{CodeCarte: c.CodeCarte, Statut: c.Statut, Vendeur: c.Vendeur, DateActivation: c.DateActivation})
		}
	}

	orders := []models.CardOrder{}
	if cursor, err := db.Collection(models.CardOrdersCollection).Find(ctx,
		bson.M{"$or": []bson.M{{"userId": objID}, {"email": user.Email}}},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})); err == nil {
		_ = cursor.All(ctx, &orders)
	}

	plan := config.DefaultAiPlan
	var sub models.Subscription
	if err := db.Collection(models.SubscriptionsCollection).FindOne(ctx, bson.M{"userId": objID}).Decode(&sub); err == nil && sub.Plan != "" {
		plan = sub.Plan
	}

	prospects := []adminProspectView{}
	prospectCount, _ := db.Collection(models.ProspectsCollection).CountDocuments(ctx, bson.M{"profileOwnerId": objID})
	if cursor, err := db.Collection(models.ProspectsCollection).Find(ctx, bson.M{"profileOwnerId": objID},
		options.Find().SetSort(bson.D{{Key: "dateCapture", Value: -1}}).SetLimit(10)); err == nil {
		var list []models.Prospect
		_ = cursor.All(ctx, &list)
		for _, pr := range list {
			prospects = append(prospects, adminProspectView{DateCapture: pr.DateCapture, Nom: pr.Nom, Contact: pr.Contact, Message: pr.Message})
		}
	}

	var viewCount int64
	if user.ProfileURL != "" {
		viewCount, _ = db.Collection(models.ViewEventsCollection).CountDocuments(ctx, bson.M{"profileUrl": user.ProfileURL})
	}

	providers := make([]string, 0, len(user.Providers))
	for _, pr := range user.Providers {
		providers = append(providers, pr.Provider)
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"user": map[string]any{
			"_id": user.ID, "email": user.Email, "name": user.Name, "role": user.Role,
			"profileUrl": user.ProfileURL, "disabled": user.Disabled, "aiEnabled": user.AiEnabled,
			"onboardingStatus": user.OnboardingStatus, "hasPassword": user.PasswordHash != "",
			"providers": providers, "enterpriseId": user.EnterpriseID,
			"createdAt": user.CreatedAt, "updatedAt": user.UpdatedAt,
		},
		"profile":       profile,
		"plan":          plan,
		"cards":         cards,
		"orders":        orders,
		"prospectCount": prospectCount,
		"prospects":     prospects,
		"viewCount":     viewCount,
	})
}
