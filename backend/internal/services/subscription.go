package services

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/config"
	"mahu-backend/internal/db"
	"mahu-backend/internal/models"
)

const oneDay = 24 * time.Hour

// One-time bonus on account creation (bigger than the free plan's daily
// refill) so a brand new user can try image, video, and audio generation at
// least once before falling back to the plan's normal daily credits.
const welcomeCreditBonus = 100

// GetOrCreateSubscription loads the caller's subscription, creating a default
// "gratuit" one on first use, and refills daily credits once
// CreditsRenewAt has elapsed.
func GetOrCreateSubscription(ctx context.Context, userID primitive.ObjectID) (*models.Subscription, error) {
	col := db.Collection(models.SubscriptionsCollection)

	var sub models.Subscription
	err := col.FindOne(ctx, bson.M{"userId": userID}).Decode(&sub)
	if err == mongo.ErrNoDocuments {
		now := time.Now()
		sub = models.Subscription{
			ID:             primitive.NewObjectID(),
			UserID:         userID,
			Plan:           config.DefaultAiPlan,
			CreditBalance:  welcomeCreditBonus,
			CreditsRenewAt: now,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		if _, err := col.InsertOne(ctx, sub); err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}

	plan := sub.Plan
	if plan == "" {
		plan = config.DefaultAiPlan
	}

	if time.Since(sub.CreditsRenewAt) >= oneDay {
		sub.CreditBalance = config.AIPlans[plan].DailyCredits
		sub.CreditsRenewAt = time.Now()
		_, err := col.UpdateOne(ctx, bson.M{"_id": sub.ID}, bson.M{"$set": bson.M{
			"creditBalance":  sub.CreditBalance,
			"creditsRenewAt": sub.CreditsRenewAt,
			"updatedAt":      time.Now(),
		}}, options.Update())
		if err != nil {
			return nil, err
		}
	}

	return &sub, nil
}

func DeductCredits(ctx context.Context, sub *models.Subscription, amount int) error {
	newBalance := sub.CreditBalance - amount
	if newBalance < 0 {
		newBalance = 0
	}
	sub.CreditBalance = newBalance

	col := db.Collection(models.SubscriptionsCollection)
	_, err := col.UpdateOne(ctx, bson.M{"_id": sub.ID}, bson.M{"$set": bson.M{
		"creditBalance": newBalance,
		"updatedAt":     time.Now(),
	}})
	return err
}
