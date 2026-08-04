package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const LegacyDocumentsCollection = "legacy_documents"

// LegacyDocument mirrors the previous "Documents" sheet (the user's document
// vault: ID cards, etc). Named "Legacy" to avoid clashing with the AI chat
// Message/Conversation collections already in this package.
type LegacyDocument struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	UserID    primitive.ObjectID `bson:"userId"`
	Type      string             `bson:"type"`
	Nom       string             `bson:"nom"`
	URL       string             `bson:"url"`
	DateAjout time.Time          `bson:"dateAjout"`
}
