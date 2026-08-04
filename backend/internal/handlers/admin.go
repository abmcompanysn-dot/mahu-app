package handlers

import (
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/middleware"
	"mahu-backend/internal/models"
)

const statsCacheKey = "admin:stats"
const statsTTLSeconds = 30

type planCounts struct {
	Gratuit int `json:"gratuit"`
	Premium int `json:"premium"`
	Pro     int `json:"pro"`
}

type adminStats struct {
	AdminCount             int64      `json:"adminCount"`
	AnnouncementCount      int64      `json:"announcementCount"`
	ActiveAnnouncementCount int64     `json:"activeAnnouncementCount"`
	UserCount              int64      `json:"userCount"`
	Plans                  planCounts `json:"plans"`
}

func (d *Deps) GetStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	if cached, err := db.GetCache[adminStats](ctx, statsCacheKey); err == nil && cached != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"adminCount":              cached.AdminCount,
			"announcementCount":       cached.AnnouncementCount,
			"activeAnnouncementCount": cached.ActiveAnnouncementCount,
			"userCount":               cached.UserCount,
			"plans":                   cached.Plans,
			"cached":                  true,
		})
		return
	}

	adminCount, err := db.Collection(models.AdminUsersCollection).CountDocuments(ctx, bson.M{})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	announcementCount, err := db.Collection(models.AnnouncementsCollection).CountDocuments(ctx, bson.M{})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	activeAnnouncementCount, err := db.Collection(models.AnnouncementsCollection).CountDocuments(ctx, bson.M{"active": true})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	userCount, err := db.Collection(models.UsersCollection).CountDocuments(ctx, bson.M{})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	plans := planCounts{}
	cursor, err := db.Collection(models.SubscriptionsCollection).Aggregate(ctx, mongo.Pipeline{
		bson.D{{Key: "$group", Value: bson.D{{Key: "_id", Value: "$plan"}, {Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}}}}},
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	var planResults []struct {
		ID    string `bson:"_id"`
		Count int    `bson:"count"`
	}
	if err := cursor.All(ctx, &planResults); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	for _, p := range planResults {
		switch p.ID {
		case "gratuit":
			plans.Gratuit = p.Count
		case "premium":
			plans.Premium = p.Count
		case "pro":
			plans.Pro = p.Count
		}
	}

	stats := adminStats{
		AdminCount:              adminCount,
		AnnouncementCount:       announcementCount,
		ActiveAnnouncementCount: activeAnnouncementCount,
		UserCount:               userCount,
		Plans:                   plans,
	}

	_ = db.SetCache(ctx, statsCacheKey, stats, statsTTLSeconds)

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"adminCount":              stats.AdminCount,
		"announcementCount":       stats.AnnouncementCount,
		"activeAnnouncementCount": stats.ActiveAnnouncementCount,
		"userCount":               stats.UserCount,
		"plans":                   stats.Plans,
		"cached":                  false,
	})
}

const consumptionDays = 14

type bucketResult struct {
	ID           string `bson:"_id" json:"_id"`
	MessageCount int    `bson:"messageCount" json:"messageCount"`
	TokensIn     int    `bson:"tokensIn" json:"tokensIn"`
	TokensOut    int    `bson:"tokensOut" json:"tokensOut"`
}

func (d *Deps) GetConsumption(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	since := time.Now().Add(-consumptionDays * 24 * time.Hour)
	matchStage := bson.D{{Key: "$match", Value: bson.D{{Key: "createdAt", Value: bson.D{{Key: "$gte", Value: since}}}}}}

	messages := db.Collection(models.MessagesCollection)

	totalsCursor, err := messages.Aggregate(ctx, mongo.Pipeline{
		matchStage,
		bson.D{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: nil},
			{Key: "messageCount", Value: bson.D{{Key: "$sum", Value: 1}}},
			{Key: "tokensIn", Value: bson.D{{Key: "$sum", Value: "$tokensIn"}}},
			{Key: "tokensOut", Value: bson.D{{Key: "$sum", Value: "$tokensOut"}}},
		}}},
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	var totalsResults []bucketResult
	_ = totalsCursor.All(ctx, &totalsResults)

	byModelCursor, err := messages.Aggregate(ctx, mongo.Pipeline{
		matchStage,
		bson.D{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$modelName"},
			{Key: "messageCount", Value: bson.D{{Key: "$sum", Value: 1}}},
			{Key: "tokensIn", Value: bson.D{{Key: "$sum", Value: "$tokensIn"}}},
			{Key: "tokensOut", Value: bson.D{{Key: "$sum", Value: "$tokensOut"}}},
		}}},
		bson.D{{Key: "$sort", Value: bson.D{{Key: "messageCount", Value: -1}}}},
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	var byModel []bucketResult
	_ = byModelCursor.All(ctx, &byModel)

	byDayCursor, err := messages.Aggregate(ctx, mongo.Pipeline{
		matchStage,
		bson.D{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: bson.D{{Key: "$dateToString", Value: bson.D{{Key: "format", Value: "%Y-%m-%d"}, {Key: "date", Value: "$createdAt"}}}}},
			{Key: "messageCount", Value: bson.D{{Key: "$sum", Value: 1}}},
			{Key: "tokensIn", Value: bson.D{{Key: "$sum", Value: "$tokensIn"}}},
			{Key: "tokensOut", Value: bson.D{{Key: "$sum", Value: "$tokensOut"}}},
		}}},
		bson.D{{Key: "$sort", Value: bson.D{{Key: "_id", Value: 1}}}},
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	var byDay []bucketResult
	_ = byDayCursor.All(ctx, &byDay)

	activeConversationCount, err := db.Collection(models.ConversationsCollection).CountDocuments(ctx, bson.M{"updatedAt": bson.M{"$gte": since}})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	totals := bucketResult{MessageCount: 0, TokensIn: 0, TokensOut: 0}
	if len(totalsResults) > 0 {
		totals = totalsResults[0]
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"since":                   since,
		"totals":                  map[string]any{"messageCount": totals.MessageCount, "tokensIn": totals.TokensIn, "tokensOut": totals.TokensOut},
		"byModel":                 byModel,
		"byDay":                   byDay,
		"activeConversationCount": activeConversationCount,
	})
}

const paymentsPageSize = 50

func (d *Deps) GetPayments(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	cursor, err := db.Collection(models.PaymentsCollection).Find(ctx, bson.M{},
		options.Find().SetSort(bson.D{{Key: "confirmedAt", Value: -1}}).SetLimit(paymentsPageSize))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	var payments []models.Payment
	if err := cursor.All(ctx, &payments); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	userIDs := make([]primitive.ObjectID, 0, len(payments))
	seen := map[primitive.ObjectID]bool{}
	for _, p := range payments {
		if !seen[p.UserID] {
			seen[p.UserID] = true
			userIDs = append(userIDs, p.UserID)
		}
	}

	usersByID := map[primitive.ObjectID]models.PopulatedUserRef{}
	if len(userIDs) > 0 {
		userCursor, err := db.Collection(models.UsersCollection).Find(ctx, bson.M{"_id": bson.M{"$in": userIDs}})
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
			return
		}
		var users []models.User
		if err := userCursor.All(ctx, &users); err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
			return
		}
		for _, u := range users {
			usersByID[u.ID] = models.PopulatedUserRef{ID: u.ID, Email: u.Email, Name: u.Name}
		}
	}

	populatedPayments := make([]models.PaymentWithUser, 0, len(payments))
	for _, p := range payments {
		var userRef any
		if ref, ok := usersByID[p.UserID]; ok {
			userRef = ref
		} else {
			userRef = p.UserID.Hex()
		}
		provider := p.Provider
		if provider == "" {
			provider = models.PaymentProviderPaydunya
		}
		populatedPayments = append(populatedPayments, models.PaymentWithUser{
			ID:                   p.ID,
			UserID:               userRef,
			Plan:                 p.Plan,
			Provider:             provider,
			AmountXof:            p.AmountXof,
			PaydunyaInvoiceToken: p.PaydunyaInvoiceToken,
			ConfirmedAt:          p.ConfirmedAt,
			CreatedAt:            p.CreatedAt,
			UpdatedAt:            p.UpdatedAt,
		})
	}

	revenueCursor, err := db.Collection(models.PaymentsCollection).Aggregate(ctx, mongo.Pipeline{
		bson.D{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$plan"},
			{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
			{Key: "totalXof", Value: bson.D{{Key: "$sum", Value: "$amountXof"}}},
		}}},
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	var revenueByPlan []struct {
		ID       string `bson:"_id" json:"_id"`
		Count    int    `bson:"count" json:"count"`
		TotalXof int    `bson:"totalXof" json:"totalXof"`
	}
	if err := revenueCursor.All(ctx, &revenueByPlan); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	totalRevenueXof := 0
	for _, rp := range revenueByPlan {
		totalRevenueXof += rp.TotalXof
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"payments":        populatedPayments,
		"revenueByPlan":   revenueByPlan,
		"totalRevenueXof": totalRevenueXof,
	})
}

func (d *Deps) ListAnnouncements(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cursor, err := db.Collection(models.AnnouncementsCollection).Find(ctx, bson.M{},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(50))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	var announcements []models.Announcement
	if err := cursor.All(ctx, &announcements); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if announcements == nil {
		announcements = []models.Announcement{}
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"announcements": announcements})
}

type createAnnouncementRequest struct {
	Title  string `json:"title"`
	Body   string `json:"body"`
	Active *bool  `json:"active"`
}

func (d *Deps) CreateAnnouncement(w http.ResponseWriter, r *http.Request) {
	var req createAnnouncementRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Body) == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	admin, ok := middleware.Admin(r)
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	createdBy, err := primitive.ObjectIDFromHex(admin.Sub())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	active := true
	if req.Active != nil {
		active = *req.Active
	}

	ctx := r.Context()
	now := time.Now()
	announcement := models.Announcement{
		ID:        primitive.NewObjectID(),
		Title:     req.Title,
		Body:      req.Body,
		Active:    active,
		CreatedBy: createdBy,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if _, err := db.Collection(models.AnnouncementsCollection).InsertOne(ctx, announcement); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	_ = db.InvalidateCache(ctx, statsCacheKey)

	httpx.WriteJSON(w, http.StatusCreated, map[string]any{"announcement": announcement})
}
