package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const ProspectsCollection = "prospects"

// Prospect mirrors the previous "Prospects" sheet - a lead captured either
// through a profile's contact form (Canal "Profil") or the embeddable
// widget on a user's own website (Canal "Widget Site").
type Prospect struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"`
	ProfileOwnerID primitive.ObjectID `bson:"profileOwnerId"`
	DateCapture  time.Time          `bson:"dateCapture"`
	Nom          string             `bson:"nom"`
	Contact      string             `bson:"contact"`
	Message      string             `bson:"message"`
	NoteEtoiles  int                `bson:"noteEtoiles,omitempty"`
	Canal        string             `bson:"canal"`
}
