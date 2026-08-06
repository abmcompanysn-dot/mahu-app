package handlers

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/cloudinaryutil"
	"mahu-backend/internal/db"
	"mahu-backend/internal/legacyauth"
	"mahu-backend/internal/models"
)

type staffPerms struct {
	isSuper    bool
	isReseller bool
}

func (d *Deps) checkStaffAccess(user *models.User) (staffPerms, error) {
	if user == nil {
		return staffPerms{}, errors.New("Authentification requise.")
	}
	isSuper := d.Env.IsSuperAdmin(user.Email) || user.Role == models.RoleAdmin
	isReseller := user.Role == models.RoleEntreprise || user.Role == models.RoleRevendeur
	if !isSuper && !isReseller {
		return staffPerms{}, errors.New("Acces refuse. Espace reserve au staff.")
	}
	return staffPerms{isSuper: isSuper, isReseller: isReseller}, nil
}

func (d *Deps) legacyAdminRegisterClient(ctx context.Context, payload map[string]any, adminUser *models.User) (map[string]any, error) {
	if !d.Env.IsSuperAdmin(adminUser.Email) && adminUser.Role != models.RoleAdmin {
		return map[string]any{"success": false, "error": "Acces refuse. Action reservee aux administrateurs de la plateforme."}, nil
	}

	email := strings.ToLower(strings.TrimSpace(str(payload, "email")))
	if existing, err := findUserByEmail(ctx, email); err != nil {
		return nil, err
	} else if existing != nil {
		return map[string]any{"success": false, "error": "Cet email est deja utilise."}, nil
	}

	nom := str(payload, "nom")
	baseSlug := quickRegisterSlugRegexp.ReplaceAllString(strings.ToLower(orDefault(nom, "user")), "-")
	profileURL := fmt.Sprintf("%s-%d", baseSlug, rand.Intn(1000))

	password := str(payload, "password")
	storedPassword, err := legacyauth.HashPassword(password)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	user := models.User{
		ID: primitive.NewObjectID(), Email: email, Role: models.RoleEntreprise, PasswordHash: storedPassword,
		ProfileURL: profileURL, NfcCardIDs: []string{}, OnboardingStatus: models.OnboardingCompleted,
		CreatedAt: now, UpdatedAt: now,
	}
	if _, err := db.Collection(models.UsersCollection).InsertOne(ctx, user); err != nil {
		return nil, err
	}

	var photoURL, coverURL string
	if photoB64 := str(payload, "photoBase64"); photoB64 != "" {
		if url, err := cloudinaryutil.UploadBase64(d.Env, photoB64); err == nil {
			photoURL = url
		}
	}
	if coverB64 := str(payload, "coverBase64"); coverB64 != "" {
		if url, err := cloudinaryutil.UploadBase64(d.Env, coverB64); err == nil {
			coverURL = url
		}
	}

	profile := models.Profile{
		ID: primitive.NewObjectID(), UserID: user.ID, Email: email, NomComplet: nom,
		Telephone: str(payload, "telephone"), Profession: str(payload, "profession"), Compagnie: str(payload, "compagnie"),
		Location: str(payload, "location"), URLPhoto: photoURL, URLCouverture: coverURL,
		LiensSociauxJSON: "[]", LeadCaptureActif: "NON", ServicesJSON: "[]", CreatedAt: now, UpdatedAt: now,
	}
	if _, err := db.Collection(models.ProfilesCollection).InsertOne(ctx, profile); err != nil {
		return nil, err
	}

	go func() {
		body := fmt.Sprintf("Bonjour %s,<br><br>Votre compte a ete cree avec succes.<br>Email: %s<br>Mot de passe: %s<br><br>Connectez-vous ici : %s/login",
			nom, email, password, d.Env.AppURL)
		_ = d.Email.Send(email, "Bienvenue sur Mahu", body)
	}()

	return map[string]any{"success": true, "message": "Client cree avec succes."}, nil
}

func (d *Deps) legacyAdminGetCardsData(ctx context.Context, user *models.User) (map[string]any, error) {
	perms, err := d.checkStaffAccess(user)
	if err != nil {
		return nil, err
	}

	cursor, err := db.Collection(models.PhysicalCardsCollection).Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	var cards []models.PhysicalCard
	if err := cursor.All(ctx, &cards); err != nil {
		return nil, err
	}

	baseURL := d.Env.AppURL + "/c/"
	result := make([]map[string]any, 0, len(cards))
	for _, c := range cards {
		if !perms.isSuper && c.Vendeur != user.Email {
			continue
		}
		owner := c.EmailProprietaire
		if !perms.isSuper && owner != "" {
			owner = "Utilisateur Actif"
		}
		result = append(result, map[string]any{
			"Code_Carte": c.CodeCarte, "Email_Proprietaire": owner, "Date_Activation": c.DateActivation,
			"Statut": c.Statut, "Date_Vente": c.DateVente, "Vendeur": c.Vendeur, "Commentaire": c.Commentaire,
			"Tag_URL": baseURL + c.CodeCarte,
		})
	}

	return map[string]any{"success": true, "cards": result, "isSuper": perms.isSuper}, nil
}

func (d *Deps) legacyAdminGenerateCardCodes(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	perms, err := d.checkStaffAccess(user)
	if err != nil {
		return nil, err
	}
	if !perms.isSuper {
		return nil, errors.New("Action reservee au Super Admin.")
	}

	quantity := intField(payload, "quantity", 10)
	prefix := strings.ToUpper(orDefault(str(payload, "prefix"), "MH"))
	batchID := "LOT-" + strings.ToUpper(randomAlnum(5))

	docs := make([]any, 0, quantity)
	for i := 0; i < quantity; i++ {
		code := fmt.Sprintf("%s-%s", prefix, strings.ToUpper(randomAlnum(6)))
		docs = append(docs, models.PhysicalCard{CodeCarte: code, Statut: models.CardStatusBlank, Commentaire: "Genere par Admin", BatchID: batchID})
	}
	if _, err := db.Collection(models.PhysicalCardsCollection).InsertMany(ctx, docs); err != nil {
		return nil, err
	}

	return map[string]any{"success": true, "message": fmt.Sprintf("%d codes generes (Lot: %s).", quantity, batchID), "batchId": batchID}, nil
}

func (d *Deps) legacyAdminUpdateCardSale(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	if _, err := d.checkStaffAccess(user); err != nil {
		return nil, err
	}

	code := str(payload, "code")
	vendeur := orDefault(str(payload, "vendeur"), "Mahu Direct")
	now := time.Now()

	res, err := db.Collection(models.PhysicalCardsCollection).UpdateOne(ctx, bson.M{"codeCarte": code},
		bson.M{"$set": bson.M{"statut": models.CardStatusSold, "dateVente": now, "vendeur": vendeur, "commentaire": str(payload, "commentaire")}})
	if err != nil {
		return nil, err
	}
	if res.MatchedCount == 0 {
		return map[string]any{"success": false, "error": "Code introuvable."}, nil
	}

	return map[string]any{"success": true, "message": "Vente enregistree."}, nil
}

func (d *Deps) legacyAdminAssignCardLot(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	perms, err := d.checkStaffAccess(user)
	if err != nil {
		return nil, err
	}
	if !perms.isSuper {
		return nil, errors.New("Seul le Super Admin peut assigner des lots.")
	}

	resellerEmail := str(payload, "resellerEmail")
	var codes []string
	if raw, ok := payload["codes"].(string); ok {
		for _, c := range strings.Split(raw, ",") {
			codes = append(codes, strings.ToUpper(strings.TrimSpace(c)))
		}
	} else {
		codes = stringSlice(payload, "codes")
	}

	count := 0
	for _, code := range codes {
		res, err := db.Collection(models.PhysicalCardsCollection).UpdateOne(ctx, bson.M{"codeCarte": code},
			bson.M{"$set": bson.M{"vendeur": resellerEmail, "statut": models.CardStatusSold}})
		if err == nil && res.MatchedCount > 0 {
			count++
		}
	}

	return map[string]any{"success": true, "message": fmt.Sprintf("Lot de %d cartes assigne a %s.", len(codes), resellerEmail)}, nil
}

func (d *Deps) legacyAdminCreateReseller(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	perms, err := d.checkStaffAccess(user)
	if err != nil {
		return nil, err
	}
	if !perms.isSuper {
		return nil, errors.New("Action reservee au Super Admin.")
	}

	email := strings.ToLower(strings.TrimSpace(str(payload, "email")))
	if existing, err := findUserByEmail(ctx, email); err != nil {
		return nil, err
	} else if existing != nil {
		return map[string]any{"success": false, "error": "Cet email est deja utilise."}, nil
	}

	password := str(payload, "password")
	storedPassword, err := legacyauth.HashPassword(password)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	newUser := models.User{
		ID: primitive.NewObjectID(), Email: email, Role: models.RoleRevendeur, PasswordHash: storedPassword,
		NfcCardIDs: []string{}, OnboardingStatus: models.OnboardingCompleted, CreatedAt: now, UpdatedAt: now,
	}
	if _, err := db.Collection(models.UsersCollection).InsertOne(ctx, newUser); err != nil {
		return nil, err
	}

	reseller := models.Reseller{
		Email: email, NomEntreprise: str(payload, "name"), ContactTel: str(payload, "phone"),
		TotalCartes: 0, StatutPartenaire: "Actif",
	}
	if _, err := db.Collection(models.ResellersCollection).InsertOne(ctx, reseller); err != nil {
		return nil, err
	}

	d.logAction(ctx, "adminCreateReseller", models.LogStatusSuccess, "Nouveau revendeur cree : "+email, user.Email)
	return map[string]any{"success": true, "message": "Le compte revendeur a ete cree avec succes."}, nil
}

func (d *Deps) legacyAdminDeactivateCard(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	if _, err := d.checkStaffAccess(user); err != nil {
		return nil, err
	}

	code := str(payload, "code")
	res, err := db.Collection(models.PhysicalCardsCollection).UpdateOne(ctx, bson.M{"codeCarte": code},
		bson.M{"$set": bson.M{"statut": models.CardStatusDeactivated}})
	if err != nil {
		return nil, err
	}
	if res.MatchedCount == 0 {
		return map[string]any{"success": false, "error": "Code introuvable."}, nil
	}

	d.logAction(ctx, "adminDeactivateCard", models.LogStatusWarning, fmt.Sprintf("Carte %s desactivee par %s", code, user.Email), user.Email)
	return map[string]any{"success": true, "message": "Carte desactivee avec succes."}, nil
}

func (d *Deps) legacyAdminBroadcastMessage(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	perms, err := d.checkStaffAccess(user)
	if err != nil {
		return nil, err
	}
	if !perms.isSuper {
		return nil, errors.New("Action reservee au Super Admin.")
	}

	subject := str(payload, "subject")
	title := str(payload, "title")
	message := str(payload, "message")

	cursor, err := db.Collection(models.UsersCollection).Find(ctx, bson.M{}, options.Find().SetProjection(bson.M{"email": 1}))
	if err != nil {
		return nil, err
	}
	var users []models.User
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}

	seen := map[string]bool{}
	template := fmt.Sprintf(`
    <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #000; font-size: 24px; text-align: center;">%s</h1>
      <div style="color: #444; line-height: 1.8; font-size: 16px; margin-top: 20px;">%s</div>
    </div>`, title, strings.ReplaceAll(message, "\n", "<br>"))

	count := 0
	for _, u := range users {
		email := strings.ToLower(u.Email)
		if email == "" || !strings.Contains(email, "@") || seen[email] {
			continue
		}
		seen[email] = true
		if err := d.Email.Send(email, subject, template); err == nil {
			count++
		}
	}

	return map[string]any{"success": true, "message": fmt.Sprintf("Message diffuse a %d utilisateurs.", count)}, nil
}

const alnumChars = "abcdefghijklmnopqrstuvwxyz0123456789"

func randomAlnum(n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = alnumChars[rand.Intn(len(alnumChars))]
	}
	return string(b)
}
