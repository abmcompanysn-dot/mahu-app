package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const ProductsCollection = "products"

// Category values for Product.Category - the physical support the profile
// is written to. A profile works the same whichever support carries it.
const (
	ProductCategoryNfcCard  = "carte_nfc"
	ProductCategoryRfidFob  = "porte_cle_rfid"
	ProductCategoryRfidCard = "carte_rfid"
)

// Product is one item of the shop catalogue (previously only listed as
// static HTML on mahu.cards/Boutique), now editable from the admin panel.
type Product struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Slug        string             `bson:"slug" json:"slug"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description" json:"description"`
	PriceXof    int                `bson:"priceXof" json:"priceXof"`
	// PriceIsFrom marks prices shown as "A partir de" (customisable cards).
	PriceIsFrom bool      `bson:"priceIsFrom" json:"priceIsFrom"`
	Category    string    `bson:"category" json:"category"`
	Material    string    `bson:"material" json:"material"`
	ImageURL    string    `bson:"imageUrl" json:"imageUrl"`
	Features    []string  `bson:"features" json:"features"`
	Active      bool      `bson:"active" json:"active"`
	SortOrder   int       `bson:"sortOrder" json:"sortOrder"`
	CreatedAt   time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time `bson:"updatedAt" json:"updatedAt"`
}
