package models

import "time"

const StoreOrdersCollection = "store_orders"
const CustomCardOrdersCollection = "custom_card_orders"

// StoreOrder mirrors the previous "Commandes" sheet.
type StoreOrder struct {
	Date          time.Time `bson:"date"`
	Produit       string    `bson:"produit"`
	Prix          string    `bson:"prix"`
	ClientNom     string    `bson:"clientNom"`
	ClientEmail   string    `bson:"clientEmail"`
	ClientTelephone string  `bson:"clientTelephone"`
	Statut        string    `bson:"statut"`
}

// CustomCardOrder mirrors the previous "Commandes_Custom" sheet.
type CustomCardOrder struct {
	Date        time.Time `bson:"date"`
	Materiau    string    `bson:"materiau"`
	Finition    string    `bson:"finition"`
	Prix        string    `bson:"prix"`
	Quantite    int       `bson:"quantite"`
	Total       string    `bson:"total"`
	NomTitulaire string   `bson:"nomTitulaire"`
	Entreprise  string    `bson:"entreprise"`
	Poste       string    `bson:"poste"`
}
