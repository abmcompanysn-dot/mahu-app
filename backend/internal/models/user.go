package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const UsersCollection = "users"

type Provider struct {
	Provider    string `bson:"provider" json:"provider"`
	ProviderUID string `bson:"providerUid" json:"providerUid"`
}

type User struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Email     string             `bson:"email" json:"email"`
	Name      string             `bson:"name" json:"name"`
	PhotoURL  string             `bson:"photoURL" json:"photoURL"`
	Role      string             `bson:"role" json:"role"`
	Providers []Provider         `bson:"providers" json:"providers"`

	// Legacy (email/password) account fields, migrated from the AppScript
	// "Utilisateurs" sheet. PasswordHash is empty for social-auth-only users.
	PasswordHash          string     `bson:"passwordHash,omitempty" json:"-"`
	EnterpriseID          string     `bson:"enterpriseId,omitempty" json:"enterpriseId,omitempty"`
	ProfileURL            string     `bson:"profileUrl,omitempty" json:"profileUrl,omitempty"`
	ProfileURL2           string     `bson:"profileUrl2,omitempty" json:"profileUrl2,omitempty"`
	ProfileURL3           string     `bson:"profileUrl3,omitempty" json:"profileUrl3,omitempty"`
	NfcCardIDs            []string   `bson:"nfcCardIds,omitempty" json:"nfcCardIds,omitempty"`
	OnboardingStatus      string     `bson:"onboardingStatus,omitempty" json:"onboardingStatus,omitempty"`
	ResetToken            string     `bson:"resetToken,omitempty" json:"-"`
	ResetTokenExpiration  *time.Time `bson:"resetTokenExpiration,omitempty" json:"-"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

const (
	RoleEntreprise = "Entreprise"
	RoleEmploye    = "Employe"
	RoleRevendeur  = "Revendeur"
	RoleAdmin      = "Admin"
)

const (
	OnboardingStarted   = "ONBOARDING_STARTED"
	OnboardingCompleted = "COMPLETED"
)

func (u *User) IDHex() string {
	return u.ID.Hex()
}
