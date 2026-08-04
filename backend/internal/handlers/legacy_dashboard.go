package handlers

import (
	"context"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/db"
	"mahu-backend/internal/models"
)

func (d *Deps) legacyGetDashboardData(ctx context.Context, user *models.User) (map[string]any, error) {
	profile, err := findProfileByUserID(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	if profile == nil {
		now := time.Now()
		profile = &models.Profile{
			ID:               primitive.NewObjectID(),
			UserID:           user.ID,
			Email:            user.Email,
			NomComplet:       emailPrefix(user.Email),
			LiensSociauxJSON: "[]",
			LeadCaptureActif: "NON",
			ServicesJSON:     "[]",
			CreatedAt:        now,
			UpdatedAt:        now,
		}
		if _, err := db.Collection(models.ProfilesCollection).InsertOne(ctx, profile); err != nil {
			return nil, err
		}
	}

	// Cartes physiques liees
	cardCursor, err := db.Collection(models.PhysicalCardsCollection).Find(ctx, bson.M{"emailProprietaire": user.Email})
	if err != nil {
		return nil, err
	}
	var cards []models.PhysicalCard
	_ = cardCursor.All(ctx, &cards)
	linkedCards := make([]map[string]any, 0, len(cards))
	for _, c := range cards {
		linkedCards = append(linkedCards, map[string]any{"code": c.CodeCarte, "status": c.Statut})
	}

	// Statistiques de vues (7 derniers jours + total)
	userURLs := map[string]bool{}
	for _, u := range []string{user.ProfileURL, user.ProfileURL2, user.ProfileURL3} {
		if u != "" {
			userURLs[strings.ToLower(u)] = true
		}
	}
	urlList := make([]string, 0, len(userURLs))
	for u := range userURLs {
		urlList = append(urlList, u)
	}

	viewCounts := map[string]int{"NFC": 0, "QR Code": 0, "Lien": 0}
	totalUserViews := 0
	if len(urlList) > 0 {
		sevenDaysAgo := time.Now().AddDate(0, 0, -7)
		viewCursor, err := db.Collection(models.ViewEventsCollection).Find(ctx, bson.M{"profileUrl": bson.M{"$in": urlList}})
		if err != nil {
			return nil, err
		}
		var views []models.ViewEvent
		_ = viewCursor.All(ctx, &views)
		totalUserViews = len(views)
		for _, v := range views {
			if v.DateHeure.After(sevenDaysAgo) {
				if _, ok := viewCounts[v.Source]; ok {
					viewCounts[v.Source]++
				}
			}
		}
	}
	statsLabels := []string{"NFC", "QR Code", "Lien"}
	statsData := []int{viewCounts["NFC"], viewCounts["QR Code"], viewCounts["Lien"]}

	// Prospects
	prospectCursor, err := db.Collection(models.ProspectsCollection).Find(ctx,
		bson.M{"profileOwnerId": user.ID}, options.Find().SetSort(bson.D{{Key: "dateCapture", Value: -1}}).SetLimit(10))
	if err != nil {
		return nil, err
	}
	var prospects []models.Prospect
	_ = prospectCursor.All(ctx, &prospects)
	userProspects := make([]map[string]any, 0, len(prospects))
	for _, p := range prospects {
		userProspects = append(userProspects, map[string]any{
			"id": p.ProfileOwnerID.Hex(), "date": p.DateCapture, "nom": p.Nom,
			"contact": p.Contact, "note": p.Message, "rating": p.NoteEtoiles, "canal": p.Canal,
		})
	}
	totalProspectsCount, err := db.Collection(models.ProspectsCollection).CountDocuments(ctx, bson.M{"profileOwnerId": user.ID})
	if err != nil {
		return nil, err
	}

	// Documents
	docCursor, err := db.Collection(models.LegacyDocumentsCollection).Find(ctx, bson.M{"userId": user.ID})
	if err != nil {
		return nil, err
	}
	var docs []models.LegacyDocument
	_ = docCursor.All(ctx, &docs)
	userDocs := make([]map[string]any, 0, len(docs))
	for _, doc := range docs {
		userDocs = append(userDocs, map[string]any{
			"id": doc.ID.Hex(), "type": doc.Type, "name": doc.Nom, "url": doc.URL, "date": doc.DateAjout,
		})
	}

	// Equipe (Entreprise/Admin)
	teamData := []map[string]any{}
	enterpriseData := map[string]any{}
	if user.Role == models.RoleEntreprise || user.Role == models.RoleAdmin {
		empCursor, err := db.Collection(models.UsersCollection).Find(ctx, bson.M{"enterpriseId": user.ID.Hex()})
		if err != nil {
			return nil, err
		}
		var employees []models.User
		_ = empCursor.All(ctx, &employees)
		for _, emp := range employees {
			leadsCount, _ := db.Collection(models.ProspectsCollection).CountDocuments(ctx, bson.M{"profileOwnerId": emp.ID})
			teamData = append(teamData, map[string]any{
				"id": emp.ID.Hex(), "name": emailPrefix(emp.Email), "email": emp.Email, "url": emp.ProfileURL, "leads": leadsCount,
			})
		}

		enterpriseData = map[string]any{
			"Name": profile.Compagnie, "Phone": profile.Telephone, "Address": profile.Location,
		}
	}

	// Derniere commande boutique
	var lastOrder any
	var order models.StoreOrder
	err = db.Collection(models.StoreOrdersCollection).FindOne(ctx,
		bson.M{"clientEmail": user.Email}, options.FindOne().SetSort(bson.D{{Key: "date", Value: -1}})).Decode(&order)
	if err == nil {
		status := order.Statut
		if status == "" {
			status = "En cours"
		}
		lastOrder = map[string]any{"date": order.Date, "product": order.Produit, "status": status}
	}

	return map[string]any{
		"user":            userToMap(user),
		"profile":         profileToMap(profile),
		"prospects":       userProspects,
		"documents":       userDocs,
		"appUrl":          d.Env.AppURL + "/p",
		"stats":           map[string]any{"labels": statsLabels, "data": statsData},
		"totalViews":      totalUserViews,
		"totalProspects":  totalProspectsCount,
		"team":            teamData,
		"onboardingStatus": user.OnboardingStatus,
		"linkedCards":     linkedCards,
		"enterprise":      enterpriseData,
		"lastOrder":       lastOrder,
	}, nil
}
