package handlers

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"regexp"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"mahu-backend/internal/authutil"
	"mahu-backend/internal/db"
	"mahu-backend/internal/legacyauth"
	"mahu-backend/internal/models"
)

var slugCleanRegexp = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	return strings.Trim(slugCleanRegexp.ReplaceAllString(strings.ToLower(s), ""), "-")
}

func welcomeEmailHTML(loginURL string) string {
	return fmt.Sprintf(`
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eeeeee;">
        <div style="background-color: #000000; padding: 30px 20px; text-align: center;">
          <img src="https://mahu.cards/r/logo.png" alt="Mahu Logo" style="height: 50px;">
        </div>
        <div style="padding: 40px 30px; color: #1a1a1a; line-height: 1.8; font-size: 16px;">
          <h2 style="color: #000000; margin-top: 0; font-weight: 300; letter-spacing: 1px; text-transform: uppercase; font-size: 24px; text-align: center; margin-bottom: 30px;">Bienvenue chez Mahu</h2>
          <p>Bonjour,</p>
          <p>C'est un plaisir de vous accueillir. Votre compte Mahu a ete cree avec succes.</p>
          <p>Configurez des a present votre carte de visite numerique et distinguez-vous.</p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="%s" style="background-color: #000000; color: #ffffff; padding: 16px 32px; text-decoration: none; font-weight: 500; font-size: 14px; display: inline-block; letter-spacing: 1px; text-transform: uppercase;">Acceder a mon espace</a>
          </div>
        </div>
      </div>`, loginURL)
}

func resetEmailHTML(resetURL string) (string, string) {
	html := fmt.Sprintf(`
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eeeeee;">
      <div style="background-color: #000000; padding: 30px 20px; text-align: center;">
        <img src="https://mahu.cards/r/logo.png" alt="Mahu Logo" style="height: 50px;">
      </div>
      <div style="padding: 40px 30px; color: #1a1a1a; line-height: 1.8; font-size: 16px;">
        <h2 style="color: #000000; margin-top: 0; font-weight: 300; letter-spacing: 1px; text-transform: uppercase; font-size: 24px; text-align: center; margin-bottom: 30px;">Reinitialisation</h2>
        <p>Bonjour,</p>
        <p>Nous avons recu une demande de reinitialisation pour votre compte Mahu.</p>
        <div style="text-align: center; margin: 40px 0;">
          <a href="%s" style="background-color: #000000; color: #ffffff; padding: 16px 32px; text-decoration: none; font-weight: 500; font-size: 14px; display: inline-block; letter-spacing: 1px; text-transform: uppercase;">Reinitialiser le mot de passe</a>
        </div>
        <p style="font-size: 13px; color: #666;">Ce lien est valide pendant <strong>5 minutes</strong>.</p>
        <p style="font-size: 13px; color: #999; margin-top: 30px; font-style: italic;">Si vous n'avez pas demande cette reinitialisation, ignorez cet e-mail.</p>
      </div>
    </div>`, resetURL)
	text := fmt.Sprintf("Bonjour,\n\nVous avez demande la reinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous (valide 5 minutes) pour continuer:\n%s\n\nSi vous n'etes pas a l'origine de cette demande, ignorez cet e-mail.\n\nL'equipe Mahu", resetURL)
	return html, text
}

func (d *Deps) legacyRegisterUser(ctx context.Context, email, password, enterpriseID string) (map[string]any, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || password == "" {
		return nil, errors.New("L'email et le mot de passe sont requis.")
	}

	existing, err := findUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return map[string]any{"success": false, "error": "Cet email est deja utilise."}, nil
	}

	storedPassword, err := legacyauth.HashPassword(password)
	if err != nil {
		return nil, err
	}

	role := models.RoleEntreprise
	if enterpriseID != "" {
		role = models.RoleEmploye
	}

	profileURL := slugify(emailPrefix(email)) + fmt.Sprintf("%d", rand.Intn(1000))

	now := time.Now()
	user := models.User{
		ID:               primitive.NewObjectID(),
		Email:            email,
		Role:             role,
		PasswordHash:     storedPassword,
		EnterpriseID:     enterpriseID,
		ProfileURL:       profileURL,
		NfcCardIDs:       []string{},
		OnboardingStatus: models.OnboardingStarted,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if _, err := db.Collection(models.UsersCollection).InsertOne(ctx, user); err != nil {
		return nil, err
	}

	profile := models.Profile{
		ID:               primitive.NewObjectID(),
		UserID:           user.ID,
		Email:            email,
		NomComplet:       emailPrefix(email),
		LiensSociauxJSON: "[]",
		LeadCaptureActif: "NON",
		ServicesJSON:     "[]",
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if _, err := db.Collection(models.ProfilesCollection).InsertOne(ctx, profile); err != nil {
		return nil, err
	}

	token, err := authutil.SignUserToken(d.Env.JWTSecret, user.ID.Hex(), user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	go func() {
		loginURL := d.Env.AppURL + "/login"
		if err := d.Email.Send(email, "Bienvenue sur Mahu !", welcomeEmailHTML(loginURL)); err != nil {
			d.logAction(context.Background(), "registerUser", models.LogStatusError, "Erreur envoi email bienvenue: "+err.Error(), email)
		}
	}()

	return map[string]any{"success": true, "newUser": true, "token": token}, nil
}

func (d *Deps) legacyLoginUser(ctx context.Context, email, password string) (map[string]any, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	user, err := findUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if user == nil || user.PasswordHash == "" {
		return map[string]any{"success": false, "error": "Email ou mot de passe incorrect."}, nil
	}

	valid, upgraded, newStored := legacyauth.VerifyPassword(user.PasswordHash, password)
	if !valid {
		return map[string]any{"success": false, "error": "Email ou mot de passe incorrect."}, nil
	}

	if user.Disabled {
		return map[string]any{"success": false, "error": "Ce compte a ete desactive."}, nil
	}

	if upgraded {
		_, _ = db.Collection(models.UsersCollection).UpdateOne(ctx, bson.M{"_id": user.ID},
			bson.M{"$set": bson.M{"passwordHash": newStored, "updatedAt": time.Now()}})
	}

	token, err := authutil.SignUserToken(d.Env.JWTSecret, user.ID.Hex(), user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return map[string]any{
		"success": true,
		"newUser": user.OnboardingStatus != models.OnboardingCompleted,
		"token":   token,
		"role":    user.Role,
	}, nil
}

func (d *Deps) legacyForgotPassword(ctx context.Context, email string) (map[string]any, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil, errors.New("L'email est requis.")
	}
	genericSuccess := map[string]any{"success": true, "message": "Verifiez votre boite mail. Un lien vous a ete envoye, il expire dans 5 minutes."}

	user, err := findUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	// Do not reveal whether the account exists, for security.
	if user == nil {
		d.logAction(ctx, "forgotPassword", models.LogStatusInfo, "Tentative de reset pour un email inexistant: "+email, email)
		return genericSuccess, nil
	}

	resetToken, err := legacyauth.NewUUID()
	if err != nil {
		return nil, err
	}
	expiration := time.Now().Add(5 * time.Minute)

	_, err = db.Collection(models.UsersCollection).UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{
		"resetToken":           resetToken,
		"resetTokenExpiration": expiration,
		"updatedAt":            time.Now(),
	}})
	if err != nil {
		return nil, err
	}

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", d.Env.AppURL, resetToken)
	htmlBody, textBody := resetEmailHTML(resetURL)

	go func() {
		if err := d.Email.Send(email, "Reinitialisation de votre mot de passe Mahu", htmlBody, textBody); err != nil {
			d.logAction(context.Background(), "forgotPassword", models.LogStatusError, "Erreur envoi email reset: "+err.Error(), email)
		}
	}()

	d.logAction(ctx, "forgotPassword", models.LogStatusSuccess, "Email de reinitialisation envoye a "+email, email)
	return genericSuccess, nil
}

func (d *Deps) legacyResetPassword(ctx context.Context, token, newPassword string) (map[string]any, error) {
	if token == "" || newPassword == "" {
		return nil, errors.New("Le token et le nouveau mot de passe sont requis.")
	}

	var user models.User
	err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"resetToken": token}).Decode(&user)
	if err != nil {
		d.logAction(ctx, "resetPassword", models.LogStatusError, "Tentative de reset avec un token invalide: "+token, "anonyme")
		return map[string]any{"success": false, "error": "Token invalide ou deja utilise."}, nil
	}

	if user.ResetTokenExpiration == nil || user.ResetTokenExpiration.Before(time.Now()) {
		d.logAction(ctx, "resetPassword", models.LogStatusError, "Tentative de reset avec un token expire: "+token, "anonyme")
		return map[string]any{"success": false, "error": "Le token a expire."}, nil
	}

	storedPassword, err := legacyauth.HashPassword(newPassword)
	if err != nil {
		return nil, err
	}

	_, err = db.Collection(models.UsersCollection).UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
		"$set":   bson.M{"passwordHash": storedPassword, "updatedAt": time.Now()},
		"$unset": bson.M{"resetToken": "", "resetTokenExpiration": ""},
	})
	if err != nil {
		return nil, err
	}

	return map[string]any{"success": true}, nil
}
