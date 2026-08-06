package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const AdminUsersCollection = "adminusers"

type AdminUser struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Email        string             `bson:"email" json:"email"`
	PasswordHash string             `bson:"passwordHash" json:"-"`
	Name         string             `bson:"name" json:"name"`
	Role         string             `bson:"role" json:"role"`
	TOTPSecret   string             `bson:"totpSecret,omitempty" json:"-"`
	TOTPEnabled  bool               `bson:"totpEnabled" json:"totpEnabled"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
}
