package models

import "time"

const SettingsCollection = "settings"

// PricingSettingsID is the _id of the single pricing document in settings.
const PricingSettingsID = "pricing"

// PricingSettings holds the prices the admin edits from /admin/pricing.
// A product's own DepositXof and a reseller's ActivationPriceXof override
// these defaults.
type PricingSettings struct {
	ID string `bson:"_id" json:"-"`
	// DefaultDepositXof is paid by deposit signups for products without
	// their own deposit.
	DefaultDepositXof int `bson:"defaultDepositXof" json:"defaultDepositXof"`
	// CodeActivationPriceXof is paid to sign up with a card code; 0 = free.
	CodeActivationPriceXof int       `bson:"codeActivationPriceXof" json:"codeActivationPriceXof"`
	UpdatedAt              time.Time `bson:"updatedAt" json:"updatedAt"`
}
