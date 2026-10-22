package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const CloudPCsCollection = "cloud_pcs"

const (
	CloudPCActive    = "actif"
	CloudPCSuspended = "suspendu"
)

// CloudPC is a client's computer in the cloud ("l'ordinateur le plus fin au
// monde"): a Linux desktop in the mahu-pc namespace, opened by scanning its
// NFC card (CardCode) and typing a secret code.
type CloudPC struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	CardCode   string             `bson:"cardCode" json:"cardCode"`
	OwnerName  string             `bson:"ownerName" json:"ownerName"`
	OwnerEmail string             `bson:"ownerEmail" json:"ownerEmail"`
	OS         string             `bson:"os" json:"os"`
	// PinHash : code secret du client (salt$sha256, comme les mots de passe).
	PinHash string `bson:"pinHash" json:"-"`
	// RDPPassword : mot de passe interne du bureau, jamais montre au client.
	RDPPassword    string     `bson:"rdpPassword" json:"-"`
	Status         string     `bson:"status" json:"status"`
	Running        bool       `bson:"running" json:"running"`
	FailedAttempts int        `bson:"failedAttempts" json:"failedAttempts"`
	LockedUntil    *time.Time `bson:"lockedUntil,omitempty" json:"lockedUntil,omitempty"`
	ExpiresAt      time.Time  `bson:"expiresAt" json:"expiresAt"`
	LastLoginAt    *time.Time `bson:"lastLoginAt,omitempty" json:"lastLoginAt,omitempty"`
	StartedAt      *time.Time `bson:"startedAt,omitempty" json:"startedAt,omitempty"`
	CreatedAt      time.Time  `bson:"createdAt" json:"createdAt"`
}
