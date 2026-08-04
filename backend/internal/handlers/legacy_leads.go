package handlers

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"mahu-backend/internal/db"
	"mahu-backend/internal/models"
)

func leadNotificationHTML(name, contact, message, connectionURL string) string {
	messageBlock := ""
	if message != "" {
		messageBlock = fmt.Sprintf(`<p style="margin: 15px 0 5px 0; font-size: 15px;"><strong>MESSAGE :</strong></p><p style="margin: 0; font-style: italic; color: #555;">"%s"</p>`, message)
	}
	return fmt.Sprintf(`
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eeeeee;">
      <div style="background-color: #000000; padding: 30px 20px; text-align: center;">
        <img src="https://mahu.cards/r/logo.png" alt="Mahu Logo" style="height: 50px;">
      </div>
      <div style="padding: 40px 30px; color: #1a1a1a; line-height: 1.8; font-size: 16px;">
        <h2 style="color: #000000; margin-top: 0; font-weight: 300; letter-spacing: 1px; text-transform: uppercase; font-size: 22px; text-align: center; margin-bottom: 10px;">Nouvelle Opportunite</h2>
        <p style="text-align: center; font-size: 28px; font-weight: 700; color: #000; margin: 0 0 30px 0;">%s</p>
        <p>Bonjour,</p>
        <p><strong>%s</strong> vient de laisser ses coordonnees sur votre carte Mahu.</p>
        <div style="background-color: #f9f9f9; padding: 25px; border-left: 4px solid #000000; margin: 30px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 5px 0; font-size: 15px;"><strong>NOM :</strong> %s</p>
            <p style="margin: 5px 0; font-size: 15px;"><strong>CONTACT :</strong> %s</p>
            %s
        </div>
        <div style="text-align: center; margin: 40px 0;">
          <a href="%s" style="background-color: #000000; color: #ffffff; padding: 16px 32px; text-decoration: none; font-weight: 500; font-size: 14px; display: inline-block; letter-spacing: 1px; text-transform: uppercase;">Voir mes prospects</a>
        </div>
      </div>
    </div>`, name, name, name, contact, messageBlock, connectionURL)
}

func (d *Deps) legacyHandleLeadCapture(ctx context.Context, payload map[string]any) (map[string]any, error) {
	profileURL := str(payload, "profileUrl")
	name := str(payload, "name")
	contact := str(payload, "contact")
	message := str(payload, "message")

	if profileURL == "" || name == "" || contact == "" {
		return nil, errors.New("Donnees de prospect incompletes.")
	}

	owner, err := findProfileOwnerByURL(ctx, profileURL)
	if err != nil {
		return nil, err
	}
	if owner == nil {
		return nil, errors.New("Profil source introuvable.")
	}

	prospect := models.Prospect{
		ProfileOwnerID: owner.ID,
		DateCapture:    time.Now(),
		Nom:            name,
		Contact:        contact,
		Message:        message,
		Canal:          "Profil",
	}
	if _, err := db.Collection(models.ProspectsCollection).InsertOne(ctx, prospect); err != nil {
		return nil, err
	}

	if owner.Email != "" {
		go func() {
			connectionURL := d.Env.AppURL + "/login?email=" + owner.Email
			subject := fmt.Sprintf("Nouvelle opportunite - %s vous a laisse ses coordonnees", name)
			if err := d.Email.Send(owner.Email, subject, leadNotificationHTML(name, contact, message, connectionURL)); err != nil {
				d.logAction(context.Background(), "handleLeadCapture", models.LogStatusError, "Erreur envoi email prospect: "+err.Error(), owner.Email)
			}
		}()
	}

	return map[string]any{"success": true}, nil
}

func (d *Deps) legacySubmitWidgetMessage(ctx context.Context, payload map[string]any) (map[string]any, error) {
	profileURL := str(payload, "profileUrl")
	name := str(payload, "name")
	if profileURL == "" || name == "" {
		return nil, errors.New("Donnees du widget incompletes.")
	}

	owner, err := findProfileOwnerByURL(ctx, profileURL)
	if err != nil {
		return nil, err
	}
	if owner == nil {
		return nil, errors.New("Site Mahu introuvable pour ce widget.")
	}

	rating := intField(payload, "rating", 0)
	if rating < 1 || rating > 5 {
		rating = 0
	}
	message := str(payload, "message")
	contact := str(payload, "contact")

	prospect := models.Prospect{
		ProfileOwnerID: owner.ID,
		DateCapture:    time.Now(),
		Nom:            name,
		Contact:        contact,
		Message:        message,
		NoteEtoiles:    rating,
		Canal:          "Widget Site",
	}
	if _, err := db.Collection(models.ProspectsCollection).InsertOne(ctx, prospect); err != nil {
		return nil, err
	}

	if owner.Email != "" {
		go func() {
			connectionURL := d.Env.AppURL + "/login?email=" + owner.Email
			subject := fmt.Sprintf("%s vous a laisse un message via votre site web", name)
			if err := d.Email.Send(owner.Email, subject, leadNotificationHTML(name, contact, message, connectionURL)); err != nil {
				d.logAction(context.Background(), "submitWidgetMessage", models.LogStatusError, "Erreur envoi email widget: "+err.Error(), owner.Email)
			}
		}()
	}

	return map[string]any{"success": true}, nil
}

func (d *Deps) legacyExportLeadsAsCSV(ctx context.Context, user *models.User) (string, error) {
	cursor, err := db.Collection(models.ProspectsCollection).Find(ctx, bson.M{"profileOwnerId": user.ID})
	if err != nil {
		return "", err
	}
	var prospects []models.Prospect
	if err := cursor.All(ctx, &prospects); err != nil {
		return "", err
	}

	headers := []string{"ID_Profil_Source", "Date_Capture", "Nom_Prospect", "Contact_Prospect", "Message_Note", "Note_Etoiles", "Canal"}
	var b strings.Builder
	b.WriteString(strings.Join(headers, ","))
	b.WriteString("\n")

	esc := func(s string) string {
		return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
	}

	for _, p := range prospects {
		row := []string{
			esc(p.ProfileOwnerID.Hex()),
			esc(p.DateCapture.Format(time.RFC3339)),
			esc(p.Nom),
			esc(p.Contact),
			esc(p.Message),
			esc(strconv.Itoa(p.NoteEtoiles)),
			esc(p.Canal),
		}
		b.WriteString(strings.Join(row, ","))
		b.WriteString("\n")
	}

	return b.String(), nil
}
