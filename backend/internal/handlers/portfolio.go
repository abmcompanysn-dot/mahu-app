package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/db"
	"mahu-backend/internal/models"
)

// Portfolio etudiant : offre a 3 500 FCFA (portfolio numerique + carte
// digitale professionnelle Mahu, valables un an). Le portfolio est cree au
// paiement (finalizeCardOrder) puis edite depuis le tableau de bord.

const portfolioValidity = 365 * 24 * time.Hour

func findPortfolio(ctx context.Context, userID primitive.ObjectID) (*models.Portfolio, error) {
	var p models.Portfolio
	err := db.Collection(models.PortfoliosCollection).FindOne(ctx, bson.M{"userId": userID}).Decode(&p)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// activatePortfolio cree (ou prolonge d'un an) le portfolio d'un utilisateur.
func activatePortfolio(ctx context.Context, userID primitive.ObjectID) error {
	now := time.Now()
	existing, err := findPortfolio(ctx, userID)
	if err != nil {
		return err
	}
	if existing != nil {
		from := existing.ExpiresAt
		if now.After(from) {
			from = now
		}
		_, err = db.Collection(models.PortfoliosCollection).UpdateOne(ctx, bson.M{"_id": existing.ID},
			bson.M{"$set": bson.M{"expiresAt": from.Add(portfolioValidity), "updatedAt": now}})
		return err
	}
	_, err = db.Collection(models.PortfoliosCollection).InsertOne(ctx, models.Portfolio{
		ID: primitive.NewObjectID(), UserID: userID, Template: models.PortfolioTemplates[0],
		Skills: []string{}, Languages: []string{}, Projects: []models.PortfolioItem{},
		Experiences: []models.PortfolioItem{}, Education: []models.PortfolioItem{},
		Published: true, ExpiresAt: now.Add(portfolioValidity), CreatedAt: now, UpdatedAt: now,
	})
	return err
}

// ---- tableau de bord (utilisateur connecte)

func (d *Deps) legacyGetPortfolio(ctx context.Context, user *models.User) (map[string]any, error) {
	p, err := findPortfolio(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return map[string]any{"success": true, "active": false, "profileUrl": user.ProfileURL}, nil
	}
	return map[string]any{"success": true, "active": time.Now().Before(p.ExpiresAt), "portfolio": p, "profileUrl": user.ProfileURL}, nil
}

func cleanStrings(raw any, maxItems, maxLen int) []string {
	out := []string{}
	list, _ := raw.([]any)
	for _, v := range list {
		s, _ := v.(string)
		if s = clip(s, maxLen); s != "" && len(out) < maxItems {
			out = append(out, s)
		}
	}
	return out
}

func cleanLink(s string) string {
	s = clip(s, 300)
	if s == "" {
		return ""
	}
	if !strings.HasPrefix(s, "http://") && !strings.HasPrefix(s, "https://") {
		s = "https://" + s
	}
	if u, err := url.Parse(s); err != nil || u.Host == "" {
		return ""
	}
	return s
}

func cleanItems(raw any, maxItems int) []models.PortfolioItem {
	out := []models.PortfolioItem{}
	list, _ := raw.([]any)
	for _, v := range list {
		m, _ := v.(map[string]any)
		if m == nil || len(out) >= maxItems {
			continue
		}
		item := models.PortfolioItem{
			Title: clip(str(m, "title"), 120), Org: clip(str(m, "org"), 120), Period: clip(str(m, "period"), 60),
			Description: clip(str(m, "description"), 1200), Link: cleanLink(str(m, "link")), ImageURL: cleanLink(str(m, "imageUrl")),
			VideoURL: cleanLink(str(m, "videoUrl")), Tools: clip(str(m, "tools"), 200),
		}
		if item.Title != "" {
			out = append(out, item)
		}
	}
	return out
}

func (d *Deps) legacySavePortfolio(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	p, err := findPortfolio(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return map[string]any{"success": false, "error": "Ton portfolio n'est pas encore active. Commande l'offre Portfolio etudiant."}, nil
	}
	template := str(payload, "template")
	valid := false
	for _, t := range models.PortfolioTemplates {
		valid = valid || t == template
	}
	if !valid {
		template = p.Template
	}
	set := bson.M{
		"template": template, "title": clip(str(payload, "title"), 60), "headline": clip(str(payload, "headline"), 140), "about": clip(str(payload, "about"), 2000),
		"school": clip(str(payload, "school"), 140), "field": clip(str(payload, "field"), 140), "level": clip(str(payload, "level"), 60),
		"skills": cleanStrings(payload["skills"], 20, 40), "languages": cleanStrings(payload["languages"], 8, 40),
		"projects": cleanItems(payload["projects"], 12), "experiences": cleanItems(payload["experiences"], 10),
		"education": cleanItems(payload["education"], 8), "cvUrl": cleanLink(str(payload, "cvUrl")),
		"published": boolField(payload, "published"), "updatedAt": time.Now(),
	}
	if _, err := db.Collection(models.PortfoliosCollection).UpdateOne(ctx, bson.M{"_id": p.ID}, bson.M{"$set": set}); err != nil {
		return nil, err
	}
	return map[string]any{"success": true}, nil
}

// ---- page publique /portfolio/{profil}

func (d *Deps) legacyGetPortfolioPublic(ctx context.Context, slug string) (map[string]any, error) {
	slug = strings.ToLower(strings.TrimSpace(slug))
	if slug == "" {
		return map[string]any{"error": "Portfolio introuvable."}, nil
	}
	var user models.User
	if err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"$or": []bson.M{
		{"profileUrl": slug}, {"profileUrl2": slug}, {"profileUrl3": slug},
	}}).Decode(&user); err != nil {
		return map[string]any{"error": "Portfolio introuvable."}, nil
	}
	p, err := findPortfolio(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	if p == nil || !p.Published {
		return map[string]any{"error": "Portfolio introuvable."}, nil
	}
	if time.Now().After(p.ExpiresAt) {
		return map[string]any{"error": "Ce portfolio a expire.", "expired": true}, nil
	}
	profile, _ := d.legacyGetProfileData(ctx, user.ProfileURL)
	return map[string]any{"portfolio": p, "profile": profile, "profileUrl": user.ProfileURL}, nil
}

// ---- produit

var portfolioProduct = models.Product{
	Slug: "portfolio-etudiant", Name: "Portfolio étudiant + carte digitale (1 an)", PriceXof: 3500, DepositXof: 3500,
	Category: models.ProductCategoryPortfolio, ImageURL: "/products/portfolio-etudiant.png",
	Description: "Ton portfolio numérique en ligne avec un modèle au choix, et ta carte digitale professionnelle Mahu, valables un an.",
	Features:    []string{"5 modèles de portfolio au choix", "Projets avec vidéos, compétences, formation, CV", "Carte digitale professionnelle Mahu", "Valable 1 an", "Réservé aux étudiants"},
}

// EnsurePortfolioProduct ajoute l'offre etudiante au catalogue si elle manque.
func EnsurePortfolioProduct(ctx context.Context) error {
	p := portfolioProduct
	now := time.Now()
	p.ID = primitive.NewObjectID()
	p.Active = true
	p.SortOrder = 50
	p.CreatedAt, p.UpdatedAt = now, now
	_, err := db.Collection(models.ProductsCollection).UpdateOne(ctx, bson.M{"slug": p.Slug}, bson.M{"$setOnInsert": p}, options.Update().SetUpsert(true))
	return err
}

// ---- admin : activation pour un compte deja existant (paiement hors ligne)

func (d *Deps) legacyAdminActivatePortfolio(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	if _, err := d.checkStaffAccess(user); err != nil {
		return nil, err
	}
	email := strings.ToLower(strings.TrimSpace(str(payload, "email")))
	if email == "" {
		return map[string]any{"success": false, "error": "Email requis."}, nil
	}
	var target models.User
	if err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"email": email}).Decode(&target); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return map[string]any{"success": false, "error": "Aucun compte avec cet email."}, nil
		}
		return nil, err
	}
	if err := activatePortfolio(ctx, target.ID); err != nil {
		return nil, err
	}
	p, err := findPortfolio(ctx, target.ID)
	if err != nil || p == nil {
		return nil, err
	}
	d.logAction(ctx, "adminActivatePortfolio", models.LogStatusSuccess, "Portfolio active pour "+email+" par "+user.Email, user.Email)
	return map[string]any{"success": true, "expiresAt": p.ExpiresAt, "profileUrl": target.ProfileURL,
		"message": "Portfolio actif jusqu'au " + p.ExpiresAt.Format("02/01/2006") + "."}, nil
}

// ---- admin : cartes etudiants a imprimer (planches A4 de 3 x 3)

func (d *Deps) legacyAdminListPortfolioCards(ctx context.Context, user *models.User) (map[string]any, error) {
	if _, err := d.checkStaffAccess(user); err != nil {
		return nil, err
	}
	cursor, err := db.Collection(models.PortfoliosCollection).Find(ctx, bson.M{"expiresAt": bson.M{"$gt": time.Now()}},
		options.Find().SetSort(bson.M{"createdAt": -1}))
	if err != nil {
		return nil, err
	}
	var portfolios []models.Portfolio
	if err := cursor.All(ctx, &portfolios); err != nil {
		return nil, err
	}
	ranks, err := freeCardRanks(ctx)
	if err != nil {
		return nil, err
	}
	cards := []map[string]any{}
	for _, p := range portfolios {
		var u models.User
		if err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"_id": p.UserID}).Decode(&u); err != nil || u.ProfileURL == "" {
			continue
		}
		name, photo := u.Name, ""
		if profile, _ := d.legacyGetProfileData(ctx, u.ProfileURL); profile != nil {
			if data, ok := profile["data"].(map[string]any); ok {
				profile = data
			}
			if s, _ := profile["Nom_Complet"].(string); s != "" {
				name = s
			}
			photo, _ = profile["URL_Photo"].(string)
		}
		cards = append(cards, map[string]any{
			"id": p.ID.Hex(), "name": name, "email": u.Email, "photo": photo, "profileUrl": u.ProfileURL,
			"title": p.Title, "skills": p.Skills, "field": p.Field, "level": p.Level, "school": p.School, "expiresAt": p.ExpiresAt, "printedAt": p.PrintedAt,
			"freeCardRank": ranks[p.ID],
		})
	}
	return map[string]any{"success": true, "cards": cards}, nil
}

func (d *Deps) legacyAdminMarkPortfolioCardsPrinted(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	if _, err := d.checkStaffAccess(user); err != nil {
		return nil, err
	}
	ids := []primitive.ObjectID{}
	list, _ := payload["ids"].([]any)
	for _, v := range list {
		s, _ := v.(string)
		if id, err := primitive.ObjectIDFromHex(s); err == nil {
			ids = append(ids, id)
		}
	}
	if len(ids) == 0 {
		return map[string]any{"success": false, "error": "Aucune carte selectionnee."}, nil
	}
	now := time.Now()
	res, err := db.Collection(models.PortfoliosCollection).UpdateMany(ctx, bson.M{"_id": bson.M{"$in": ids}}, bson.M{"$set": bson.M{"printedAt": now}})
	if err != nil {
		return nil, err
	}
	d.logAction(ctx, "adminMarkPortfolioCardsPrinted", models.LogStatusSuccess, fmt.Sprintf("%d carte(s) etudiant marquee(s) imprimee(s)", res.ModifiedCount), user.Email)
	return map[string]any{"success": true, "updated": res.ModifiedCount}, nil
}

// ---- lancement : carte imprimee offerte aux 100 premiers inscrits

const portfolioFreeCards = 100

func (d *Deps) legacyGetPortfolioOffer(ctx context.Context) (map[string]any, error) {
	n, err := db.Collection(models.PortfoliosCollection).CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	left := portfolioFreeCards - int(n)
	if left < 0 {
		left = 0
	}
	return map[string]any{"success": true, "freeCardsTotal": portfolioFreeCards, "freeCardsLeft": left}, nil
}

// freeCardRanks donne le rang (1 a 100) des portfolios dont la carte est offerte.
func freeCardRanks(ctx context.Context) (map[primitive.ObjectID]int, error) {
	cursor, err := db.Collection(models.PortfoliosCollection).Find(ctx, bson.M{},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}, {Key: "_id", Value: 1}}).SetLimit(portfolioFreeCards).SetProjection(bson.M{"_id": 1}))
	if err != nil {
		return nil, err
	}
	var docs []struct {
		ID primitive.ObjectID `bson:"_id"`
	}
	if err := cursor.All(ctx, &docs); err != nil {
		return nil, err
	}
	ranks := make(map[primitive.ObjectID]int, len(docs))
	for i, doc := range docs {
		ranks[doc.ID] = i + 1
	}
	return ranks, nil
}
