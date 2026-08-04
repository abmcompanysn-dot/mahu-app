package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const BiometricCardsCollection = "biometriccards"

type BiometricCard struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	UserID          primitive.ObjectID `bson:"userId" json:"userId"`
	CardCode        string             `bson:"cardCode" json:"cardCode"`
	ProfileUsername string             `bson:"profileUsername" json:"profileUsername"`
	RedirectMode    string             `bson:"redirectMode" json:"redirectMode"`
	FaceDescriptor  []float64          `bson:"faceDescriptor" json:"faceDescriptor"`
	Enabled         bool               `bson:"enabled" json:"enabled"`
	CreatedAt       time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time          `bson:"updatedAt" json:"updatedAt"`
}
