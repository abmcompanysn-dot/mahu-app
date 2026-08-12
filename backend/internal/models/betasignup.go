package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const BetaSignupsCollection = "beta_signups"

// BetaSignup is a public waitlist entry for the paid AI card beta,
// submitted anonymously (no account required) from the standalone
// beta-carte-ai static page.
type BetaSignup struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Name      string             `bson:"name" json:"name"`
	Email     string             `bson:"email" json:"email"`
	Phone     string             `bson:"phone" json:"phone"`
	Address   string             `bson:"address" json:"address"`
	Country   string             `bson:"country" json:"country"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}
