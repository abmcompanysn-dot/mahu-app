// Dev-only helper: creates (or reuses) a test account and prints a valid JWT
// plus its AI card link, to test AI mode without a real Firebase login. Never
// use this in production.
//
//	MONGO_URI=... ./seedtestuser
package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/authutil"
	"mahu-backend/internal/config"
	"mahu-backend/internal/db"
	"mahu-backend/internal/models"
)

func generateCardCode() (string, error) {
	buf := make([]byte, 9)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func main() {
	env, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	if err := db.ConnectMongo(env.MongoURI); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	ctx := context.Background()
	email := "test@mahu.local"

	usersCol := db.Collection(models.UsersCollection)
	var user models.User
	err = usersCol.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		now := time.Now()
		user = models.User{
			ID:        primitive.NewObjectID(),
			Email:     email,
			Name:      "Testeur Mahu",
			Role:      "Entreprise",
			CreatedAt: now,
			UpdatedAt: now,
		}
		if _, err := usersCol.InsertOne(ctx, user); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
	} else if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	subsCol := db.Collection(models.SubscriptionsCollection)
	_, err = subsCol.UpdateOne(ctx, bson.M{"userId": user.ID},
		bson.M{"$setOnInsert": bson.M{
			"userId":         user.ID,
			"plan":           config.DefaultAiPlan,
			"creditBalance":  config.AIPlans[config.DefaultAiPlan].DailyCredits,
			"creditsRenewAt": time.Now(),
			"createdAt":      time.Now(),
			"updatedAt":      time.Now(),
		}},
		options.Update().SetUpsert(true),
	)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	cardsCol := db.Collection(models.BiometricCardsCollection)
	var card models.BiometricCard
	err = cardsCol.FindOne(ctx, bson.M{"userId": user.ID}).Decode(&card)
	if err == mongo.ErrNoDocuments {
		code, err := generateCardCode()
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		now := time.Now()
		card = models.BiometricCard{
			ID:           primitive.NewObjectID(),
			UserID:       user.ID,
			CardCode:     code,
			RedirectMode: "choice",
			CreatedAt:    now,
			UpdatedAt:    now,
		}
		if _, err := cardsCol.InsertOne(ctx, card); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
	} else if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	token, err := authutil.SignUserToken(env.JWTSecret, user.ID.Hex(), user.Email, user.Role)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	fmt.Printf("EMAIL: %s\n", user.Email)
	fmt.Printf("TOKEN: %s\n", token)
	fmt.Printf("CARD_CODE: %s\n", card.CardCode)

	_ = db.Client.Disconnect(ctx)
}
