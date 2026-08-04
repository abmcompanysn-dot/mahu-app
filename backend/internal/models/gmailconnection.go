package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const GmailConnectionsCollection = "gmail_connections"

// GmailConnection is a Mahu user's own Gmail account, linked via OAuth so
// Mahu can send email as them (see handlers/connectors_gmail.go). The first
// of the "connecteurs Mahu" integrations, modeled after Claude's own
// Connectors (Gmail, Canva, ...): the user - not the platform - authorizes
// the link, and can revoke it at any time.
type GmailConnection struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"`
	UserID       primitive.ObjectID `bson:"userId"`
	GoogleEmail  string             `bson:"googleEmail"`
	RefreshToken string             `bson:"refreshToken"`
	ConnectedAt  time.Time          `bson:"connectedAt"`
	UpdatedAt    time.Time          `bson:"updatedAt"`
}
