package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const PaymentsCollection = "payments"

// Provider values for Payment.Provider.
const (
	PaymentProviderPaydunya = "paydunya"
	PaymentProviderPawaPay  = "pawapay"
)

type Payment struct {
	ID     primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	UserID primitive.ObjectID `bson:"userId" json:"userId"`
	Plan   string             `bson:"plan" json:"plan"`
	// Provider defaults to "paydunya" for rows created before PawaPay support
	// was added - see the omitempty json handling in PaymentWithUser.
	Provider  string `bson:"provider" json:"provider"`
	AmountXof int    `bson:"amountXof" json:"amountXof"`
	// PaydunyaInvoiceToken doubles as the generic external reference (also
	// holds the PawaPay checkoutId for Provider=="pawapay") - kept unique
	// either way, so it still works as the idempotency key.
	PaydunyaInvoiceToken string    `bson:"paydunyaInvoiceToken" json:"paydunyaInvoiceToken"`
	ConfirmedAt          time.Time `bson:"confirmedAt" json:"confirmedAt"`
	CreatedAt            time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt            time.Time `bson:"updatedAt" json:"updatedAt"`
}

// PaymentWithUser mirrors the shape produced by Mongoose's
// .populate("userId", "email name") used in the previous admin.controller.ts.
type PaymentWithUser struct {
	ID                   primitive.ObjectID `json:"_id"`
	UserID               any                `json:"userId"`
	Plan                 string             `json:"plan"`
	Provider             string             `json:"provider"`
	AmountXof            int                `json:"amountXof"`
	PaydunyaInvoiceToken string             `json:"paydunyaInvoiceToken"`
	ConfirmedAt          time.Time          `json:"confirmedAt"`
	CreatedAt            time.Time          `json:"createdAt"`
	UpdatedAt            time.Time          `json:"updatedAt"`
}

type PopulatedUserRef struct {
	ID    primitive.ObjectID `json:"_id"`
	Email string              `json:"email"`
	Name  string              `json:"name"`
}
