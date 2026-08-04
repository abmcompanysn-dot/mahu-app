package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const SubscriptionsCollection = "subscriptions"

type Subscription struct {
	ID                  primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	UserID              primitive.ObjectID `bson:"userId" json:"userId"`
	Plan                string             `bson:"plan" json:"plan"`
	CreditBalance       int                `bson:"creditBalance" json:"creditBalance"`
	CreditsRenewAt      time.Time          `bson:"creditsRenewAt" json:"creditsRenewAt"`
	RenewsAt            *time.Time         `bson:"renewsAt" json:"renewsAt"`
	PaydunyaInvoiceToken string            `bson:"paydunyaInvoiceToken" json:"paydunyaInvoiceToken"`
	CreatedAt           time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt           time.Time          `bson:"updatedAt" json:"updatedAt"`
}
