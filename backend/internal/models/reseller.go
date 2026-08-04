package models

const ResellersCollection = "resellers"

// Reseller mirrors the previous "Resellers" sheet - the commercial-tracking
// counterpart to a User with Role "Revendeur".
type Reseller struct {
	Email           string `bson:"email"`
	NomEntreprise   string `bson:"nomEntreprise"`
	ContactTel      string `bson:"contactTel"`
	TotalCartes     int    `bson:"totalCartes"`
	StatutPartenaire string `bson:"statutPartenaire"`
}
