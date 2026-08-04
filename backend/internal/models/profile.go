package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const ProfilesCollection = "profiles"

// Profile mirrors the previous AppScript "Profils" sheet, one document per
// User (keyed by UserID). Handlers build the outgoing JSON as maps keyed by
// the exact legacy column names (Nom_Complet, URL_Photo, ...) so the
// frontend (lib/api.ts Profile interface) needs zero changes - see
// handlers/legacy.go's profileToMap.
type Profile struct {
	ID                  primitive.ObjectID `bson:"_id,omitempty"`
	UserID              primitive.ObjectID `bson:"userId"`
	Email               string             `bson:"email"`
	NomComplet          string             `bson:"nomComplet"`
	Telephone           string             `bson:"telephone"`
	Profession          string             `bson:"profession"`
	Compagnie           string             `bson:"compagnie"`
	Location            string             `bson:"location"`
	URLPhoto            string             `bson:"urlPhoto"`
	URLCouverture       string             `bson:"urlCouverture"`
	LiensSociauxJSON    string             `bson:"liensSociauxJson"`
	LeadCaptureActif    string             `bson:"leadCaptureActif"`
	ServicesJSON        string             `bson:"servicesJson"`
	MiseEnPage          string             `bson:"miseEnPage"`
	CouleurTheme        string             `bson:"couleurTheme"`
	CacherMarque        string             `bson:"cacherMarque"`
	Langue              string             `bson:"langue"`
	RedirectionSiteWeb  string             `bson:"redirectionSiteWeb"`
	CreatedAt           time.Time          `bson:"createdAt"`
	UpdatedAt           time.Time          `bson:"updatedAt"`
}
