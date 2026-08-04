package db

import (
	"context"
	"net/url"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/models"
)

var (
	Client *mongo.Client
	DB     *mongo.Database
)

func dbNameFromURI(uri string) string {
	u, err := url.Parse(uri)
	if err != nil {
		return "mahu"
	}
	name := strings.TrimPrefix(u.Path, "/")
	if name == "" {
		return "mahu"
	}
	return name
}

func ConnectMongo(uri string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return err
	}
	if err := client.Ping(ctx, nil); err != nil {
		return err
	}

	Client = client
	DB = client.Database(dbNameFromURI(uri))
	return nil
}

func Collection(name string) *mongo.Collection {
	return DB.Collection(name)
}

// EnsureIndexes creates the unique indexes previously provided for free by
// Mongoose's `unique: true` schema option (this backend uses the plain
// mongo-driver, which does not create indexes on its own).
func EnsureIndexes(ctx context.Context) error {
	type spec struct {
		collection string
		keys       bson.D
		unique     bool
		sparse     bool
	}

	specs := []spec{
		{models.UsersCollection, bson.D{{Key: "email", Value: 1}}, true, false},
		{models.UsersCollection, bson.D{{Key: "profileUrl", Value: 1}}, true, true},
		{models.AdminUsersCollection, bson.D{{Key: "email", Value: 1}}, true, false},
		{models.BiometricCardsCollection, bson.D{{Key: "cardCode", Value: 1}}, true, false},
		{models.BiometricCardsCollection, bson.D{{Key: "userId", Value: 1}}, true, false},
		{models.PaymentsCollection, bson.D{{Key: "paydunyaInvoiceToken", Value: 1}}, true, false},
		{models.SubscriptionsCollection, bson.D{{Key: "userId", Value: 1}}, true, false},
		{models.ProfilesCollection, bson.D{{Key: "userId", Value: 1}}, true, false},
		{models.PhysicalCardsCollection, bson.D{{Key: "codeCarte", Value: 1}}, true, false},
		{models.PawaPayCheckoutsCollection, bson.D{{Key: "checkoutId", Value: 1}}, true, false},
		{models.GmailConnectionsCollection, bson.D{{Key: "userId", Value: 1}}, true, false},
		{models.SocialConnectionsCollection, bson.D{{Key: "userId", Value: 1}, {Key: "provider", Value: 1}}, true, false},
	}

	for _, s := range specs {
		opts := options.Index().SetUnique(s.unique)
		if s.sparse {
			opts.SetSparse(true)
		}
		_, err := Collection(s.collection).Indexes().CreateOne(ctx, mongo.IndexModel{Keys: s.keys, Options: opts})
		if err != nil {
			return err
		}
	}
	return nil
}

func IsConnected() bool {
	if Client == nil {
		return false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	return Client.Ping(ctx, nil) == nil
}
