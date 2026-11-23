package handlers

import (
	"context"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/db"
	"mahu-backend/internal/models"
)

// Multi-profils : un compte (un email, un mot de passe) peut avoir plusieurs
// profils publics, chacun avec sa propre adresse /p/<adresse>, ses infos, ses
// liens, ses images et ses vues. Le profil principal reste dans "profiles" ;
// les autres sont dans "extra_profiles" (voir models.ExtraProfile). Regle
// commerciale : chaque profil en plus consomme un code de carte.

const maxExtraProfiles = 20

var limitExtraProfileCode = attemptLimit{"extra-profile-code", 10, 15 * time.Minute}

func findExtraProfileBySlug(ctx context.Context, slug string) (*models.ExtraProfile, error) {
	var ep models.ExtraProfile
	err := db.Collection(models.ExtraProfilesCollection).FindOne(ctx, bson.M{"slug": normalizeProfileSlug(slug)}).Decode(&ep)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &ep, nil
}

func listExtraProfiles(ctx context.Context, userID primitive.ObjectID) ([]models.ExtraProfile, error) {
	cursor, err := db.Collection(models.ExtraProfilesCollection).Find(ctx, bson.M{"userId": userID},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}}))
	if err != nil {
		return nil, err
	}
	list := []models.ExtraProfile{}
	err = cursor.All(ctx, &list)
	return list, err
}

// ownedExtraProfile returns the extra profile at slug only if it belongs to user.
func ownedExtraProfile(ctx context.Context, user *models.User, slug string) (*models.ExtraProfile, error) {
	ep, err := findExtraProfileBySlug(ctx, slug)
	if err != nil || ep == nil || ep.UserID != user.ID {
		return nil, err
	}
	return ep, nil
}

func extraProfilePublicData(user *models.User, ep *models.ExtraProfile) map[string]any {
	data := profileToMap(&ep.Profile)
	data["Email"] = publicEmail(user, &ep.Profile)
	data["URL_Profil"] = ep.Slug
	return data
}

// addExtraProfile creates a new profile at slug for user, claiming the card
// code. Shared by the client action and the admin endpoint; the admin path
// skips the paid-activation check (MAHU was paid directly).
func (d *Deps) addExtraProfile(ctx context.Context, user *models.User, slugRaw, codeRaw string, adminPath bool) (map[string]any, error) {
	slug := normalizeProfileSlug(slugRaw)
	code := strings.ToUpper(strings.TrimSpace(codeRaw))
	fail := func(msg string) (map[string]any, error) { return map[string]any{"success": false, "error": msg}, nil }

	if problem, err := profileSlugProblem(ctx, slug); err != nil {
		return nil, err
	} else if problem != "" {
		return fail(problem)
	}
	if n, err := db.Collection(models.ExtraProfilesCollection).CountDocuments(ctx, bson.M{"userId": user.ID}); err != nil {
		return nil, err
	} else if n >= maxExtraProfiles {
		return fail("Nombre maximum de profils atteint.")
	}

	if code == "" {
		return fail("Entrez le code de la carte pour ce nouveau profil.")
	}
	if !adminPath && limitExtraProfileCode.blocked(ctx, user.ID.Hex()) {
		return fail(tooManyAttemptsMsg)
	}
	card, err := findActivatableCard(ctx, code)
	if err != nil {
		return nil, err
	}
	if card == nil {
		if !adminPath {
			limitExtraProfileCode.fail(ctx, user.ID.Hex())
		}
		return fail("Code de carte inconnu, deja utilise ou desactive.")
	}
	if !adminPath {
		pricing, err := getPricing(ctx)
		if err != nil {
			return nil, err
		}
		if price, err := codeActivationPrice(ctx, *card, pricing); err != nil {
			return nil, err
		} else if price > 0 {
			return fail("Ce code demande un paiement : contactez MAHU pour l'activer sur votre compte.")
		}
	}

	// Le nouveau profil part des infos du profil principal (nom, telephone,
	// photo, couleur) : le client n'a plus qu'a changer ce qui differe.
	now := time.Now()
	ep := models.ExtraProfile{
		Profile: models.Profile{ID: primitive.NewObjectID(), UserID: user.ID, Email: user.Email,
			LeadCaptureActif: "OUI", CreatedAt: now, UpdatedAt: now},
		Slug:     slug,
		CardCode: code,
	}
	if main, err := findProfileByUserID(ctx, user.ID); err == nil && main != nil {
		ep.NomComplet, ep.Telephone, ep.URLPhoto, ep.CouleurTheme = main.NomComplet, main.Telephone, main.URLPhoto, main.CouleurTheme
	}
	// Profil d'abord (index unique sur l'adresse), carte ensuite : si la carte
	// vient d'etre prise par quelqu'un d'autre, on retire le profil.
	if _, err := db.Collection(models.ExtraProfilesCollection).InsertOne(ctx, ep); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return fail("Cette adresse est deja utilisee.")
		}
		return nil, err
	}
	res, err := db.Collection(models.PhysicalCardsCollection).UpdateOne(ctx,
		bson.M{"codeCarte": code, "emailProprietaire": bson.M{"$in": []any{"", nil}}},
		bson.M{"$set": bson.M{"emailProprietaire": user.Email, "dateActivation": now, "statut": models.CardStatusActive}})
	if err != nil || res.ModifiedCount == 0 {
		_, _ = db.Collection(models.ExtraProfilesCollection).DeleteOne(ctx, bson.M{"_id": ep.ID})
		if err != nil {
			return nil, err
		}
		return fail("Code de carte deja utilise.")
	}
	if !adminPath {
		limitExtraProfileCode.reset(ctx, user.ID.Hex())
	}
	_ = db.InvalidateCache(ctx, profileCacheKey(slug))
	d.logAction(ctx, "addExtraProfile", models.LogStatusSuccess, "Profil supplementaire /p/"+slug+" (code "+code+")", user.Email)
	return map[string]any{"success": true, "profileUrl": slug}, nil
}

// saveExtraProfileFields applies legacy column fields (same names as
// saveProfile) to an extra profile and refreshes its public cache.
func saveExtraProfileFields(ctx context.Context, user *models.User, ep *models.ExtraProfile, payload map[string]any) error {
	delete(payload, "URL_Profil") // l'adresse d'un profil supplementaire ne change pas
	applyProfileFields(&ep.Profile, payload)
	ep.UpdatedAt = time.Now()
	_, err := db.Collection(models.ExtraProfilesCollection).UpdateOne(ctx, bson.M{"_id": ep.ID}, bson.M{"$set": bson.M{
		"nomComplet": ep.NomComplet, "telephone": ep.Telephone, "profession": ep.Profession, "compagnie": ep.Compagnie,
		"location": ep.Location, "urlPhoto": ep.URLPhoto, "urlCouverture": ep.URLCouverture, "liensSociauxJson": ep.LiensSociauxJSON,
		"leadCaptureActif": ep.LeadCaptureActif, "servicesJson": ep.ServicesJSON, "miseEnPage": ep.MiseEnPage,
		"couleurTheme": ep.CouleurTheme, "cacherMarque": ep.CacherMarque, "langue": ep.Langue,
		"redirectionSiteWeb": ep.RedirectionSiteWeb, "modeConfidentiel": ep.ModeConfidentiel, "emailPublic": ep.EmailPublic,
		"updatedAt": ep.UpdatedAt,
	}})
	if err != nil {
		return err
	}
	_ = db.SetCache(ctx, profileCacheKey(ep.Slug), extraProfilePublicData(user, ep), profileCacheSeconds)
	return nil
}

// ---- actions du tableau de bord client (token requis) ----

// legacyListMyProfiles lists the account's profiles: the main one first, then the extra ones, with their view counts.
func (d *Deps) legacyListMyProfiles(ctx context.Context, user *models.User) (map[string]any, error) {
	views := func(slug string) int64 {
		n, _ := db.Collection(models.ViewEventsCollection).CountDocuments(ctx, bson.M{"profileUrl": strings.ToLower(slug)})
		return n
	}
	out := []map[string]any{}
	name := ""
	if main, err := findProfileByUserID(ctx, user.ID); err == nil && main != nil {
		name = main.NomComplet
	}
	out = append(out, map[string]any{"profileUrl": user.ProfileURL, "name": name, "primary": true, "views": views(user.ProfileURL)})
	extras, err := listExtraProfiles(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	for _, ep := range extras {
		label := ep.Compagnie
		if label == "" {
			label = ep.NomComplet
		}
		out = append(out, map[string]any{"profileUrl": ep.Slug, "name": label, "primary": false, "views": views(ep.Slug)})
	}
	return map[string]any{"success": true, "profiles": out}, nil
}

func (d *Deps) legacyGetExtraProfile(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	ep, err := ownedExtraProfile(ctx, user, str(payload, "profileUrl"))
	if err != nil {
		return nil, err
	}
	if ep == nil {
		return map[string]any{"success": false, "error": "Profil introuvable."}, nil
	}
	return map[string]any{"success": true, "profile": extraProfilePublicData(user, ep)}, nil
}

func (d *Deps) legacySaveExtraProfile(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	slug := str(payload, "profileUrl")
	ep, err := ownedExtraProfile(ctx, user, slug)
	if err != nil {
		return nil, err
	}
	if ep == nil {
		return map[string]any{"success": false, "error": "Profil introuvable."}, nil
	}
	delete(payload, "profileUrl")
	if err := saveExtraProfileFields(ctx, user, ep, payload); err != nil {
		return nil, err
	}
	return map[string]any{"success": true, "message": "Profil sauvegarde avec succes.", "urlsToPurge": []string{ep.Slug}}, nil
}

// extraProfileOwner resolves a slug that belongs to an extra profile to its
// owning account (public profile page, contact form, address checks).
func extraProfileOwner(ctx context.Context, slug string) (*models.ExtraProfile, *models.User, error) {
	ep, err := findExtraProfileBySlug(ctx, slug)
	if err != nil || ep == nil {
		return nil, nil, err
	}
	var user models.User
	if err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"_id": ep.UserID}).Decode(&user); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil, nil
		}
		return nil, nil, err
	}
	return ep, &user, nil
}
