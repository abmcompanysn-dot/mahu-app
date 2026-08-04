package handlers

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"mahu-backend/internal/authutil"
	"mahu-backend/internal/db"
	"mahu-backend/internal/legacyauth"
	"mahu-backend/internal/models"
	"mahu-backend/internal/notify"
)

func resellerNotificationHTML(code string) string {
	return fmt.Sprintf(`
    <div style="font-family: sans-serif; padding: 20px; color: #1a1a1a; border: 1px solid #eee; border-radius: 10px;">
      <img src="https://mahu.cards/r/logo.png" style="height: 40px; margin-bottom: 20px;">
      <h2 style="color: #007BFF;">Bonne nouvelle !</h2>
      <p>Le client qui a recu la carte <strong>%s</strong> vient de l'activer sur son profil.</p>
      <p>Cela confirme le succes de votre distribution. Continuez comme ca !</p>
    </div>`, code)
}

func (d *Deps) legacyActivatePhysicalCard(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	code := strings.ToUpper(strings.TrimSpace(str(payload, "activationCode")))
	if code == "" {
		return map[string]any{"success": false, "error": "Code manquant."}, nil
	}

	var card models.PhysicalCard
	err := db.Collection(models.PhysicalCardsCollection).FindOne(ctx, bson.M{"codeCarte": code}).Decode(&card)
	found := err == nil

	if found && card.EmailProprietaire != "" && card.EmailProprietaire != user.Email {
		return map[string]any{"success": false, "error": "Cette carte appartient deja a un autre utilisateur."}, nil
	}

	now := time.Now()
	if found {
		if _, err := db.Collection(models.PhysicalCardsCollection).UpdateOne(ctx, bson.M{"codeCarte": code},
			bson.M{"$set": bson.M{"emailProprietaire": user.Email, "dateActivation": now, "statut": models.CardStatusActive}}); err != nil {
			return nil, err
		}
	} else {
		card = models.PhysicalCard{CodeCarte: code, EmailProprietaire: user.Email, DateActivation: &now, Statut: models.CardStatusActive}
		if _, err := db.Collection(models.PhysicalCardsCollection).InsertOne(ctx, card); err != nil {
			return nil, err
		}
	}

	if card.Vendeur != "" && strings.Contains(card.Vendeur, "@") && card.Vendeur != "Mahu Direct" {
		go func() {
			if err := d.Email.Send(card.Vendeur, "Felicitations ! Une de vos cartes Mahu vient d'etre activee", resellerNotificationHTML(code)); err != nil {
				d.logAction(context.Background(), "activatePhysicalCard", models.LogStatusError, "Erreur notif revendeur: "+err.Error(), card.Vendeur)
			}
		}()
	}

	d.logAction(ctx, "activatePhysicalCard", models.LogStatusSuccess, fmt.Sprintf("Carte %s liee a %s", code, user.Email), user.Email)
	return map[string]any{"success": true, "message": "Carte activee avec succes !"}, nil
}

func (d *Deps) legacyCheckCardStatus(ctx context.Context, payload map[string]any) (map[string]any, error) {
	code := strings.ToUpper(strings.TrimSpace(str(payload, "code")))
	if code == "" {
		return map[string]any{"success": false, "error": "Code manquant."}, nil
	}

	var card models.PhysicalCard
	err := db.Collection(models.PhysicalCardsCollection).FindOne(ctx, bson.M{"codeCarte": code}).Decode(&card)
	if err != nil || card.Statut != models.CardStatusActive || card.EmailProprietaire == "" {
		return map[string]any{"success": true, "active": false}, nil
	}

	user, err := findUserByEmail(ctx, card.EmailProprietaire)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return map[string]any{"success": true, "active": false}, nil
	}

	return map[string]any{"success": true, "active": true, "profileUrl": user.ProfileURL}, nil
}

func (d *Deps) legacyLinkNfcCard(ctx context.Context, nfcID string, user *models.User) (map[string]any, error) {
	for _, id := range user.NfcCardIDs {
		if id == nfcID {
			return map[string]any{"success": true, "message": "Cette carte est deja liee."}, nil
		}
	}

	updated := append(append([]string{}, user.NfcCardIDs...), nfcID)
	if _, err := db.Collection(models.UsersCollection).UpdateOne(ctx, bson.M{"_id": user.ID},
		bson.M{"$set": bson.M{"nfcCardIds": updated, "updatedAt": time.Now()}}); err != nil {
		return nil, err
	}
	return map[string]any{"success": true, "message": "Carte NFC liee avec succes."}, nil
}

func (d *Deps) legacySaveCustomCardOrder(ctx context.Context, payload map[string]any) (map[string]any, error) {
	quantity := intField(payload, "quantity", 1)
	total := str(payload, "total")
	if total == "" {
		total = str(payload, "price")
	}

	order := models.CustomCardOrder{
		Date: time.Now(), Materiau: str(payload, "material"), Finition: str(payload, "finish"),
		Prix: str(payload, "price"), Quantite: quantity, Total: total,
		NomTitulaire: str(payload, "card_holder"), Entreprise: str(payload, "company_name"), Poste: str(payload, "position"),
	}
	if _, err := db.Collection(models.CustomCardOrdersCollection).InsertOne(ctx, order); err != nil {
		return nil, err
	}

	go func() {
		if len(d.Env.SuperAdminEmails) > 0 {
			body := fmt.Sprintf("Nouvelle commande recue !\n\nClient : %s\nEntreprise : %s\nPoste : %s\nMateriau : %s (%s)\nQuantite : %d\nTotal : %s FCFA",
				order.NomTitulaire, order.Entreprise, order.Poste, order.Materiau, order.Finition, quantity, total)
			_ = d.Email.Send(d.Env.SuperAdminEmails[0], "Nouvelle Commande Personnalisee Mahu", strings.ReplaceAll(body, "\n", "<br>"))
		}
		notify.SendWhatsApp(d.Env, fmt.Sprintf("Nouvelle Commande Custom\n\n%s\n%s\n%dx %s (%s)\nTotal: %s FCFA",
			order.NomTitulaire, order.Entreprise, quantity, order.Materiau, order.Finition, total))
	}()

	return map[string]any{"success": true, "whatsappNumber": d.Env.CallMeBotPhone}, nil
}

func (d *Deps) legacySaveStoreOrder(ctx context.Context, payload map[string]any) (map[string]any, error) {
	order := models.StoreOrder{
		Date: time.Now(), Produit: str(payload, "product_name"), Prix: str(payload, "price"),
		ClientNom: str(payload, "client_name"), ClientEmail: str(payload, "client_email"),
		ClientTelephone: str(payload, "client_phone"), Statut: "NOUVEAU",
	}
	if _, err := db.Collection(models.StoreOrdersCollection).InsertOne(ctx, order); err != nil {
		return nil, err
	}

	go func() {
		if len(d.Env.SuperAdminEmails) > 0 {
			body := fmt.Sprintf("Nouvelle commande boutique !\n\nProduit : %s\nPrix : %s\nClient : %s (%s)", order.Produit, order.Prix, order.ClientNom, order.ClientTelephone)
			_ = d.Email.Send(d.Env.SuperAdminEmails[0], "Nouvelle Commande Boutique Mahu", strings.ReplaceAll(body, "\n", "<br>"))
		}
		notify.SendWhatsApp(d.Env, fmt.Sprintf("Nouvelle Commande Boutique\n\n%s\n%s FCFA\n%s\n%s", order.Produit, order.Prix, order.ClientNom, order.ClientTelephone))
	}()

	return map[string]any{"success": true, "whatsappNumber": d.Env.CallMeBotPhone}, nil
}

func (d *Deps) legacyQuickRegisterAndActivate(ctx context.Context, payload map[string]any) (map[string]any, error) {
	slugRaw := str(payload, "slug")
	email := strings.ToLower(strings.TrimSpace(str(payload, "email")))
	password := str(payload, "password")
	nomComplet := str(payload, "nom_complet")

	if slugRaw == "" || email == "" || password == "" || nomComplet == "" {
		return map[string]any{"success": false, "error": "Champs obligatoires manquants (slug, email, mot de passe, nom)."}, nil
	}

	slug := quickRegisterSlugRegexp.ReplaceAllString(strings.ToLower(slugRaw), "-")
	slug = multiDashRegexp.ReplaceAllString(slug, "-")

	if existing, err := findUserByEmail(ctx, email); err != nil {
		return nil, err
	} else if existing != nil {
		return map[string]any{"success": false, "error": "Cet email est deja utilise. Connectez-vous pour activer votre carte."}, nil
	}

	var slugConflict models.User
	if err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"profileUrl": slug}).Decode(&slugConflict); err == nil {
		return map[string]any{"success": false, "error": "Cette adresse profil est deja prise. Choisissez-en une autre."}, nil
	}

	storedPassword, err := legacyauth.HashPassword(password)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	user := models.User{
		ID: primitive.NewObjectID(), Email: email, Role: models.RoleEntreprise, PasswordHash: storedPassword,
		ProfileURL: slug, NfcCardIDs: []string{}, OnboardingStatus: models.OnboardingCompleted,
		CreatedAt: now, UpdatedAt: now,
	}
	if _, err := db.Collection(models.UsersCollection).InsertOne(ctx, user); err != nil {
		return nil, err
	}

	leadCapture := str(payload, "lead_capture")
	if leadCapture == "" {
		leadCapture = "OUI"
	}
	profile := models.Profile{
		ID: primitive.NewObjectID(), UserID: user.ID, Email: email, NomComplet: nomComplet,
		Telephone: str(payload, "telephone"), Profession: str(payload, "profession"), Compagnie: str(payload, "compagnie"),
		URLPhoto: str(payload, "url_photo"), URLCouverture: str(payload, "url_couverture"),
		LiensSociauxJSON: jsonArrayOrEmpty(payload["liens_sociaux"]), LeadCaptureActif: leadCapture,
		ServicesJSON: "[]", CouleurTheme: "#4da6ff", CreatedAt: now, UpdatedAt: now,
	}
	if _, err := db.Collection(models.ProfilesCollection).InsertOne(ctx, profile); err != nil {
		return nil, err
	}

	if cardCode := strings.ToUpper(strings.TrimSpace(str(payload, "card_code"))); cardCode != "" {
		var card models.PhysicalCard
		err := db.Collection(models.PhysicalCardsCollection).FindOne(ctx, bson.M{"codeCarte": cardCode}).Decode(&card)
		if err == nil {
			_, _ = db.Collection(models.PhysicalCardsCollection).UpdateOne(ctx, bson.M{"codeCarte": cardCode},
				bson.M{"$set": bson.M{"emailProprietaire": email, "dateActivation": now, "statut": models.CardStatusActive}})
		} else {
			_, _ = db.Collection(models.PhysicalCardsCollection).InsertOne(ctx, models.PhysicalCard{
				CodeCarte: cardCode, EmailProprietaire: email, DateActivation: &now, Statut: models.CardStatusActive,
				Commentaire: "Active via formulaire QR",
			})
		}
	}

	_ = db.InvalidateCache(ctx, profileCacheKey(slug))

	d.logAction(ctx, "quickRegisterAndActivate", models.LogStatusSuccess, fmt.Sprintf("Carte activee pour %s (slug: %s)", email, slug), email)

	profilePublicURL := fmt.Sprintf("%s/p/%s", d.Env.AppURL, slug)

	go func() {
		botMsg := fmt.Sprintf("Nouvelle carte activee !\n\n%s\n%s\n\n%s", nomComplet, email, profilePublicURL)
		notify.SendWhatsApp(d.Env, botMsg)
		htmlBody := fmt.Sprintf(`<div style="font-family:sans-serif;padding:20px;"><h2>Votre carte est activee !</h2><p>Bienvenue sur Mahu, %s.</p><p>Votre lien de profil : <a href="%s">%s</a></p></div>`, nomComplet, profilePublicURL, profilePublicURL)
		if err := d.Email.Send(email, "Votre carte Mahu est activee - "+nomComplet, htmlBody); err != nil {
			d.logAction(context.Background(), "quickRegisterAndActivate", models.LogStatusError, "Email bienvenue non envoye: "+err.Error(), email)
		}
	}()

	token, err := authutil.SignUserToken(d.Env.JWTSecret, user.ID.Hex(), user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return map[string]any{"success": true, "token": token, "slug": slug, "urlsToPurge": []string{slug}}, nil
}

func jsonArrayOrEmpty(v any) string {
	arr, ok := v.([]any)
	if !ok || len(arr) == 0 {
		return "[]"
	}
	parts := make([]string, 0, len(arr))
	for _, item := range arr {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		parts = append(parts, fmt.Sprintf(`{"type":%q,"url":%q,"label":%q}`, str(m, "type"), str(m, "url"), str(m, "label")))
	}
	return "[" + strings.Join(parts, ",") + "]"
}

var quickRegisterSlugRegexp = regexp.MustCompile(`[^a-z0-9-]`)
var multiDashRegexp = regexp.MustCompile(`-+`)
