package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const PawaPayCheckoutsCollection = "pawapay_checkouts"

const (
	PawaPayCheckoutPending   = "PENDING"
	PawaPayCheckoutCompleted = "COMPLETED"
	PawaPayCheckoutFailed    = "FAILED"
)

// PawaPayCheckout is our local record of a checkout session created with
// PawaPay, keyed by the checkoutId we generate. PawaPay's callback only
// carries the checkout's own state, not which user/plan it was for, so this
// is what lets the webhook handler map a completed checkout back to a
// Subscription upgrade - see handlers/billing.go.
type PawaPayCheckout struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"`
	CheckoutID string             `bson:"checkoutId"`
	UserID     primitive.ObjectID `bson:"userId"`
	Plan       string             `bson:"plan"`
	AmountXof  int                `bson:"amountXof"`
	Status     string             `bson:"status"`
	CreatedAt  time.Time          `bson:"createdAt"`
	UpdatedAt  time.Time          `bson:"updatedAt"`
}
