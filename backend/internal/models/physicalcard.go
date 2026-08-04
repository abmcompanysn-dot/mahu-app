package models

import "time"

const PhysicalCardsCollection = "physical_cards"

// PhysicalCard mirrors the previous "PhysicalCards" sheet: the inventory of
// printed NFC cards, from blank ("Vierge") through sale ("Vendu") to
// activation ("Active") or loss/theft ("Desactivee").
type PhysicalCard struct {
	CodeCarte        string     `bson:"codeCarte"`
	EmailProprietaire string    `bson:"emailProprietaire,omitempty"`
	DateActivation   *time.Time `bson:"dateActivation,omitempty"`
	Statut           string     `bson:"statut"`
	DateVente        *time.Time `bson:"dateVente,omitempty"`
	Vendeur          string     `bson:"vendeur,omitempty"`
	Commentaire      string     `bson:"commentaire,omitempty"`
	BatchID          string     `bson:"batchId,omitempty"`
}

const (
	CardStatusBlank      = "Vierge"
	CardStatusSold       = "Vendu"
	CardStatusActive     = "Active"
	CardStatusDeactivated = "Desactivee"
)
