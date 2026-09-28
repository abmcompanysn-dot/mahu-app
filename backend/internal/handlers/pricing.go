package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/models"
)

// maxPriceXof bounds every admin-entered price, so a typo can't create a
// 100M FCFA invoice.
const maxPriceXof = 5_000_000

// getPricing returns the admin-edited prices, or the defaults when nothing
// has been saved yet.
func getPricing(ctx context.Context) (models.PricingSettings, error) {
	settings := models.PricingSettings{ID: models.PricingSettingsID, DefaultDepositXof: models.SignupDepositXof}
	err := db.Collection(models.SettingsCollection).FindOne(ctx, bson.M{"_id": models.PricingSettingsID}).Decode(&settings)
	if err != nil && err != mongo.ErrNoDocuments {
		return settings, err
	}
	return settings, nil
}

// depositFor is the deposit asked for a product: its own deposit if set,
// else the default one - never more than the product itself costs.
func depositFor(product models.Product, pricing models.PricingSettings) int {
	deposit := pricing.DefaultDepositXof
	if product.DepositXof > 0 {
		deposit = product.DepositXof
	}
	if product.PriceXof > 0 && deposit > product.PriceXof {
		deposit = product.PriceXof
	}
	return deposit
}

// codeActivationPrice is what activating this card costs: the price of the
// reseller whose lot it belongs to if they have one, else the global price.
func codeActivationPrice(ctx context.Context, card models.PhysicalCard, pricing models.PricingSettings) (int, error) {
	if strings.Contains(card.Vendeur, "@") {
		var reseller models.Reseller
		err := db.Collection(models.ResellersCollection).FindOne(ctx, bson.M{"email": strings.ToLower(card.Vendeur)}).Decode(&reseller)
		if err == nil && reseller.ActivationPriceXof != nil {
			return *reseller.ActivationPriceXof, nil
		}
		if err != nil && err != mongo.ErrNoDocuments {
			return 0, err
		}
	}
	return pricing.CodeActivationPriceXof, nil
}

// findActivatableCard returns the card for a code that can still be claimed
// (known, no owner, not deactivated), or nil.
func findActivatableCard(ctx context.Context, code string) (*models.PhysicalCard, error) {
	var card models.PhysicalCard
	err := db.Collection(models.PhysicalCardsCollection).FindOne(ctx, bson.M{"codeCarte": code}).Decode(&card)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if card.EmailProprietaire != "" || card.Statut == models.CardStatusDeactivated {
		return nil, nil
	}
	return &card, nil
}

// CheckCardCode tells the signup page whether a code can be activated and
// what it costs, before asking for the account details.
func (d *Deps) CheckCardCode(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Code string `json:"code"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	ctx := r.Context()
	card, err := findActivatableCard(ctx, strings.ToUpper(strings.TrimSpace(in.Code)))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if card == nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"valid": false})
		return
	}
	pricing, err := getPricing(ctx)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	price, err := codeActivationPrice(ctx, *card, pricing)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"valid": true, "priceXof": price})
}

// --- Admin -----------------------------------------------------------------

type adminResellerRow struct {
	Email              string `json:"email"`
	NomEntreprise      string `json:"nomEntreprise"`
	ContactTel         string `json:"contactTel"`
	TotalCartes        int    `json:"totalCartes"`
	ActivationPriceXof *int   `json:"activationPriceXof"`
}

func (d *Deps) AdminGetPricing(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	pricing, err := getPricing(ctx)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	cursor, err := db.Collection(models.ResellersCollection).Find(ctx, bson.M{},
		options.Find().SetSort(bson.D{{Key: "nomEntreprise", Value: 1}}))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	var resellers []models.Reseller
	if err := cursor.All(ctx, &resellers); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	rows := make([]adminResellerRow, 0, len(resellers))
	for _, rs := range resellers {
		rows = append(rows, adminResellerRow{
			Email: rs.Email, NomEntreprise: rs.NomEntreprise, ContactTel: rs.ContactTel,
			TotalCartes: rs.TotalCartes, ActivationPriceXof: rs.ActivationPriceXof,
		})
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"pricing": pricing, "resellers": rows})
}

func (d *Deps) AdminUpdatePricing(w http.ResponseWriter, r *http.Request) {
	var in struct {
		DefaultDepositXof      int `json:"defaultDepositXof"`
		CodeActivationPriceXof int `json:"codeActivationPriceXof"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	if in.DefaultDepositXof < 100 || in.DefaultDepositXof > maxPriceXof {
		httpx.WriteError(w, http.StatusBadRequest, "L'acompte doit etre entre 100 et 5 000 000 FCFA.")
		return
	}
	if in.CodeActivationPriceXof != 0 && (in.CodeActivationPriceXof < 100 || in.CodeActivationPriceXof > maxPriceXof) {
		httpx.WriteError(w, http.StatusBadRequest, "Le prix d'activation doit etre 0 (gratuit) ou entre 100 et 5 000 000 FCFA.")
		return
	}
	_, err := db.Collection(models.SettingsCollection).UpdateOne(r.Context(), bson.M{"_id": models.PricingSettingsID},
		bson.M{"$set": bson.M{
			"defaultDepositXof":      in.DefaultDepositXof,
			"codeActivationPriceXof": in.CodeActivationPriceXof,
			"updatedAt":              time.Now(),
		}}, options.Update().SetUpsert(true))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

// AdminUpdateResellerPrice sets (or, with null, removes) a reseller's own
// activation price.
func (d *Deps) AdminUpdateResellerPrice(w http.ResponseWriter, r *http.Request, email string) {
	var in struct {
		ActivationPriceXof *int `json:"activationPriceXof"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	update := bson.M{"$unset": bson.M{"activationPriceXof": ""}}
	if in.ActivationPriceXof != nil {
		p := *in.ActivationPriceXof
		if p != 0 && (p < 100 || p > maxPriceXof) {
			httpx.WriteError(w, http.StatusBadRequest, "Prix invalide : 0 (gratuit) ou entre 100 et 5 000 000 FCFA.")
			return
		}
		update = bson.M{"$set": bson.M{"activationPriceXof": p}}
	}
	res, err := db.Collection(models.ResellersCollection).UpdateOne(r.Context(), bson.M{"email": strings.ToLower(email)}, update)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if res.MatchedCount == 0 {
		httpx.WriteError(w, http.StatusNotFound, "Revendeur introuvable")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}
