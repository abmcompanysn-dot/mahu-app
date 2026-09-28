package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const CardOrdersCollection = "card_orders"

// SignupDepositXof is the deposit paid through PayDunya to sign up without
// a card code - the rest of the product price is paid on delivery.
const SignupDepositXof = 10000

const (
	OrderPaymentPending = "en_attente"
	OrderPaymentPaid    = "acompte_paye"
	OrderPaymentFull    = "solde"
)

const (
	OrderDeliveryToPrepare = "a_preparer"
	OrderDeliveryShipped   = "expediee"
	OrderDeliveryDelivered = "livree"
	OrderDeliveryCancelled = "annulee"
)

// CardOrder is a signup paid by deposit: the account only exists once
// PayDunya confirms the deposit (see finalizeCardOrder), so the password is
// held here hashed until then.
type CardOrder struct {
	ID              primitive.ObjectID  `bson:"_id,omitempty" json:"_id"`
	Reference       string              `bson:"reference" json:"reference"`
	ProductID       primitive.ObjectID  `bson:"productId" json:"productId"`
	ProductName     string              `bson:"productName" json:"productName"`
	ProductPriceXof int                 `bson:"productPriceXof" json:"productPriceXof"`
	DepositXof      int                 `bson:"depositXof" json:"depositXof"`
	ClientName      string              `bson:"clientName" json:"clientName"`
	Email           string              `bson:"email" json:"email"`
	Phone           string              `bson:"phone" json:"phone"`
	DeliveryAddress string              `bson:"deliveryAddress" json:"deliveryAddress"`
	PasswordHash    string              `bson:"passwordHash,omitempty" json:"-"`
	PaymentStatus   string              `bson:"paymentStatus" json:"paymentStatus"`
	DeliveryStatus  string              `bson:"deliveryStatus" json:"deliveryStatus"`
	PaydunyaToken   string              `bson:"paydunyaToken,omitempty" json:"paydunyaToken,omitempty"`
	UserID          *primitive.ObjectID `bson:"userId,omitempty" json:"userId,omitempty"`
	AdminNote       string              `bson:"adminNote,omitempty" json:"adminNote,omitempty"`
	PaidAt          *time.Time          `bson:"paidAt,omitempty" json:"paidAt,omitempty"`
	CreatedAt       time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time           `bson:"updatedAt" json:"updatedAt"`
}
