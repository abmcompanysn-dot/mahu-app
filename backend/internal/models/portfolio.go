package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const PortfoliosCollection = "portfolios"

// Modeles de portfolio proposes aux etudiants (voir components/portfolio/).
var PortfolioTemplates = []string{"eclat", "nuit", "campus", "atelier", "plan", "motion"}

// PortfolioItem est une ligne de projet, d'experience ou de formation.
type PortfolioItem struct {
	Title       string `bson:"title" json:"title"`
	Org         string `bson:"org,omitempty" json:"org,omitempty"`
	Period      string `bson:"period,omitempty" json:"period,omitempty"`
	Description string `bson:"description,omitempty" json:"description,omitempty"`
	Link        string `bson:"link,omitempty" json:"link,omitempty"`
	ImageURL    string `bson:"imageUrl,omitempty" json:"imageUrl,omitempty"`
	VideoURL    string `bson:"videoUrl,omitempty" json:"videoUrl,omitempty"`
	Tools       string `bson:"tools,omitempty" json:"tools,omitempty"` // outils, machines, logiciels
}

// Portfolio est le portfolio numerique d'un etudiant (offre "Portfolio
// etudiant" : portfolio + carte digitale professionnelle valables un an).
type Portfolio struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	UserID      primitive.ObjectID `bson:"userId" json:"-"`
	Template    string             `bson:"template" json:"template"`
	Title       string             `bson:"title,omitempty" json:"title,omitempty"` // metier, aussi imprime sur la carte
	Headline    string             `bson:"headline" json:"headline"`
	About       string             `bson:"about" json:"about"`
	School      string             `bson:"school" json:"school"`
	Field       string             `bson:"field" json:"field"`
	Level       string             `bson:"level" json:"level"`
	Skills      []string           `bson:"skills" json:"skills"`
	Languages   []string           `bson:"languages" json:"languages"`
	Projects    []PortfolioItem    `bson:"projects" json:"projects"`
	Experiences []PortfolioItem    `bson:"experiences" json:"experiences"`
	Education   []PortfolioItem    `bson:"education" json:"education"`
	// Chiffres cles (titre = valeur, description = libelle), modele Motion.
	Highlights []PortfolioItem `bson:"highlights,omitempty" json:"highlights,omitempty"`
	CVURL      string          `bson:"cvUrl,omitempty" json:"cvUrl,omitempty"`
	PrintedAt  *time.Time      `bson:"printedAt,omitempty" json:"printedAt,omitempty"` // carte physique imprimee (admin)
	Published  bool            `bson:"published" json:"published"`
	ExpiresAt  time.Time       `bson:"expiresAt" json:"expiresAt"`
	CreatedAt  time.Time       `bson:"createdAt" json:"createdAt"`
	UpdatedAt  time.Time       `bson:"updatedAt" json:"updatedAt"`
}
