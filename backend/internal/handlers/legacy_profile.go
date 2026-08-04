package handlers

import (
	"context"
	"regexp"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"mahu-backend/internal/db"
	"mahu-backend/internal/models"
)

const profileCacheSeconds = 86400

func profileCacheKey(slug string) string {
	return "profile_" + strings.ToLower(strings.TrimSpace(slug))
}

// applyProfileFields mirrors saveProfile()'s headers.forEach loop: any of
// these legacy sheet column names present in payload gets written to the
// matching Profile field. URL_Profil is deliberately excluded - it lives on
// User and is handled separately (slug uniqueness, cache key migration).
func applyProfileFields(profile *models.Profile, payload map[string]any) {
	set := func(key string, target *string) {
		if v, ok := payload[key].(string); ok {
			*target = v
		}
	}
	set("Nom_Complet", &profile.NomComplet)
	set("Telephone", &profile.Telephone)
	set("Profession", &profile.Profession)
	set("Compagnie", &profile.Compagnie)
	set("Location", &profile.Location)
	set("URL_Photo", &profile.URLPhoto)
	set("URL_Couverture", &profile.URLCouverture)
	set("Liens_Sociaux_JSON", &profile.LiensSociauxJSON)
	set("Lead_Capture_Actif", &profile.LeadCaptureActif)
	set("Services_JSON", &profile.ServicesJSON)
	set("Mise_En_Page", &profile.MiseEnPage)
	set("Couleur_Theme", &profile.CouleurTheme)
	set("Cacher_Marque", &profile.CacherMarque)
	set("Langue", &profile.Langue)
	set("Redirection_Site_Web", &profile.RedirectionSiteWeb)
}

func cacheProfileForUser(ctx context.Context, user *models.User, profile *models.Profile) {
	data := profileToMap(profile)
	data["Email"] = user.Email
	data["URL_Profil"] = user.ProfileURL

	for _, slug := range []string{user.ProfileURL, user.ProfileURL2, user.ProfileURL3} {
		if slug == "" {
			continue
		}
		_ = db.SetCache(ctx, profileCacheKey(slug), data, profileCacheSeconds)
	}
}

func (d *Deps) legacySaveProfile(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	urlsToPurge := []string{}

	// 1. Handle a profile URL (slug) change first, mirroring the original's
	// dedicated block ahead of the generic field loop.
	if newURLRaw, ok := payload["URL_Profil"].(string); ok && newURLRaw != "" && newURLRaw != user.ProfileURL {
		newURL := regexp.MustCompile(`[^a-z0-9-]`).ReplaceAllString(strings.ToLower(newURLRaw), "")
		if newURL == "" {
			return map[string]any{"success": false, "error": "L'URL du profil ne peut pas etre vide."}, nil
		}

		var conflict models.User
		err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{
			"profileUrl": newURL,
			"_id":        bson.M{"$ne": user.ID},
		}).Decode(&conflict)
		if err == nil {
			return map[string]any{"success": false, "error": "Cette URL de profil est deja utilisee. Veuillez en choisir une autre."}, nil
		}

		oldURL := user.ProfileURL
		if _, err := db.Collection(models.UsersCollection).UpdateOne(ctx, bson.M{"_id": user.ID},
			bson.M{"$set": bson.M{"profileUrl": newURL, "updatedAt": time.Now()}}); err != nil {
			return nil, err
		}
		_ = db.InvalidateCache(ctx, profileCacheKey(oldURL))
		user.ProfileURL = newURL
		urlsToPurge = append(urlsToPurge, newURL)
	}

	// 2. Update the remaining profile fields.
	profile, err := findProfileByUserID(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	if profile == nil {
		profile = &models.Profile{
			ID:        primitive.NewObjectID(),
			UserID:    user.ID,
			Email:     user.Email,
			CreatedAt: now,
		}
		applyProfileFields(profile, payload)
		profile.UpdatedAt = now
		if _, err := db.Collection(models.ProfilesCollection).InsertOne(ctx, profile); err != nil {
			return nil, err
		}
		return map[string]any{"success": true, "message": "Profil cree et sauvegarde."}, nil
	}

	applyProfileFields(profile, payload)
	profile.UpdatedAt = now
	update := bson.M{
		"nomComplet":         profile.NomComplet,
		"telephone":          profile.Telephone,
		"profession":         profile.Profession,
		"compagnie":          profile.Compagnie,
		"location":           profile.Location,
		"urlPhoto":           profile.URLPhoto,
		"urlCouverture":      profile.URLCouverture,
		"liensSociauxJson":   profile.LiensSociauxJSON,
		"leadCaptureActif":   profile.LeadCaptureActif,
		"servicesJson":       profile.ServicesJSON,
		"miseEnPage":         profile.MiseEnPage,
		"couleurTheme":       profile.CouleurTheme,
		"cacherMarque":       profile.CacherMarque,
		"langue":             profile.Langue,
		"redirectionSiteWeb": profile.RedirectionSiteWeb,
		"updatedAt":          now,
	}
	if _, err := db.Collection(models.ProfilesCollection).UpdateOne(ctx, bson.M{"_id": profile.ID}, bson.M{"$set": update}); err != nil {
		return nil, err
	}

	if len(urlsToPurge) == 0 {
		urlsToPurge = []string{user.ProfileURL}
	}
	cacheProfileForUser(ctx, user, profile)

	return map[string]any{"success": true, "message": "Profil sauvegarde avec succes.", "urlsToPurge": urlsToPurge}, nil
}

func (d *Deps) legacySaveProfileImage(ctx context.Context, imageType, imageURL string, user *models.User) (map[string]any, error) {
	if imageType != "picture" && imageType != "cover" {
		return map[string]any{"success": false, "error": "Type d'image non valide."}, nil
	}

	profile, err := findProfileByUserID(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	if profile == nil {
		return map[string]any{"success": false, "error": "Profil non trouve pour la mise a jour de l'image."}, nil
	}

	field := "urlCouverture"
	if imageType == "picture" {
		field = "urlPhoto"
		profile.URLPhoto = imageURL
	} else {
		profile.URLCouverture = imageURL
	}

	if _, err := db.Collection(models.ProfilesCollection).UpdateOne(ctx, bson.M{"_id": profile.ID},
		bson.M{"$set": bson.M{field: imageURL, "updatedAt": time.Now()}}); err != nil {
		return nil, err
	}

	cacheProfileForUser(ctx, user, profile)

	urlsToPurge := []string{}
	for _, slug := range []string{user.ProfileURL, user.ProfileURL2, user.ProfileURL3} {
		if slug != "" {
			urlsToPurge = append(urlsToPurge, slug)
		}
	}

	return map[string]any{"success": true, "message": "Image sauvegardee avec succes.", "urlsToPurge": urlsToPurge}, nil
}

// legacyGetProfileData is the PUBLIC profile lookup (app/p/[username]),
// mirroring getProfileData() including its cache and enterprise-employee
// field inheritance.
func (d *Deps) legacyGetProfileData(ctx context.Context, profileURL string) (map[string]any, error) {
	profileURL = strings.TrimSpace(profileURL)
	if profileURL == "" {
		return map[string]any{"error": "URL de profil manquante."}, nil
	}

	if cached, err := db.GetCache[map[string]any](ctx, profileCacheKey(profileURL)); err == nil && cached != nil {
		return *cached, nil
	}

	slugLower := strings.ToLower(profileURL)
	var user models.User
	err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"$or": []bson.M{
		{"profileUrl": slugLower},
		{"profileUrl2": slugLower},
		{"profileUrl3": slugLower},
	}}).Decode(&user)
	if err != nil {
		return map[string]any{"error": "Profil non trouve."}, nil
	}

	profile, err := findProfileByUserID(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	if profile == nil {
		return map[string]any{"error": "Donnees de profil introuvables."}, nil
	}

	data := profileToMap(profile)
	data["Email"] = user.Email
	data["URL_Profil"] = user.ProfileURL

	if user.EnterpriseID != "" {
		if entID, err := primitive.ObjectIDFromHex(user.EnterpriseID); err == nil {
			if entProfile, err := findProfileByUserID(ctx, entID); err == nil && entProfile != nil {
				entMap := profileToMap(entProfile)
				for _, field := range []string{"Compagnie", "Location", "URL_Couverture", "Liens_Sociaux_JSON", "Mise_En_Page", "Couleur_Theme", "Cacher_Marque", "Services_JSON"} {
					data[field] = entMap[field]
				}
			}
		}
	}

	_ = db.SetCache(ctx, profileCacheKey(profileURL), data, profileCacheSeconds)
	return data, nil
}

func (d *Deps) legacyGetPublicProfileUrl(user *models.User) map[string]any {
	return map[string]any{"success": true, "profileUrl": user.ProfileURL}
}

func (d *Deps) legacyTrackView(ctx context.Context, profileURL, source string) (map[string]any, error) {
	event := models.ViewEvent{ProfileURL: profileURL, DateHeure: time.Now(), Source: source}
	if _, err := db.Collection(models.ViewEventsCollection).InsertOne(ctx, event); err != nil {
		return map[string]any{"success": false, "error": err.Error()}, nil
	}
	return map[string]any{"success": true}, nil
}

func (d *Deps) legacyUpdateOnboardingData(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	if str(payload, "step") == "final" {
		if _, err := db.Collection(models.UsersCollection).UpdateOne(ctx, bson.M{"_id": user.ID},
			bson.M{"$set": bson.M{"onboardingStatus": models.OnboardingCompleted, "updatedAt": time.Now()}}); err != nil {
			return nil, err
		}
		return map[string]any{"success": true}, nil
	}

	if data, ok := payload["data"].(map[string]any); ok {
		if role, ok := data["Role"].(string); ok && role != "" {
			if _, err := db.Collection(models.UsersCollection).UpdateOne(ctx, bson.M{"_id": user.ID},
				bson.M{"$set": bson.M{"role": role, "updatedAt": time.Now()}}); err != nil {
				return nil, err
			}
			user.Role = role
		}
		return d.legacySaveProfile(ctx, data, user)
	}

	return map[string]any{"success": true}, nil
}

func (d *Deps) legacySetModuleState(ctx context.Context, moduleName string, isEnabled bool, user *models.User) {
	value := "NON"
	if isEnabled {
		value = "OUI"
	}
	_, _ = d.legacySaveProfile(ctx, map[string]any{moduleName: value}, user)
}
