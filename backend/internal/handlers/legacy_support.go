package handlers

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"mahu-backend/internal/db"
	"mahu-backend/internal/models"
	"mahu-backend/internal/notify"
)

func supportConfirmationHTML(subject, phone, message string) string {
	phoneLine := ""
	if phone != "" {
		phoneLine = fmt.Sprintf("<p>Nous avons note votre numero : %s</p>", phone)
	}
	return fmt.Sprintf(`
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eeeeee;">
      <div style="padding: 30px; color: #1a1a1a;">
        <h2 style="margin-top: 0;">Nous avons bien recu votre message</h2>
        <p>Bonjour,</p>
        <p>Merci d'avoir contacte le support Mahu. Nous avons bien recu votre demande concernant : "<strong>%s</strong>".</p>
        %s
        <p>Notre equipe va l'examiner et reviendra vers vous dans les plus brefs delais.</p>
        <p>Votre message :</p>
        <blockquote style="background: #f9f9f9; border-left: 4px solid #000; padding: 10px; margin: 10px 0;">%s</blockquote>
      </div>
    </div>`, subject, phoneLine, message)
}

func supportAdminHTML(subject, email, phone, message string) string {
	phoneRow := ""
	if phone != "" {
		phoneRow = fmt.Sprintf(`<tr><td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;color:#888;">Telephone</td><td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;">%s</td></tr>`, phone)
	}
	return fmt.Sprintf(`
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #eee;">
      <div style="padding:30px;color:#1a1a1a;">
        <h2 style="margin:0 0 20px;font-size:18px;color:#000;">%s</h2>
        <table style="width:100%%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;color:#888;width:110px;">De</td><td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;">%s</td></tr>
          %s
          <tr><td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;color:#888;">Date</td><td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;">%s</td></tr>
        </table>
        <div style="margin-top:20px;">
          <p style="font-size:13px;color:#666;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Message :</p>
          <div style="background:#f9f9f9;border-left:4px solid #000;padding:16px 18px;border-radius:0 8px 8px 0;font-size:14px;line-height:1.7;">%s</div>
        </div>
      </div>
    </div>`, subject, email, phoneRow, time.Now().Format("02/01/2006 15:04"), strings.ReplaceAll(message, "\n", "<br>"))
}

func (d *Deps) legacyContactSupport(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	email := str(payload, "email")
	if user != nil {
		email = user.Email
	}
	phone := str(payload, "phone")
	subject := str(payload, "subject")
	if subject == "" {
		subject = "Demande de support"
	}
	message := str(payload, "message")
	if message == "" {
		return nil, errors.New("Le message ne peut pas etre vide.")
	}

	entry := models.SupportMessage{
		Date: time.Now(), Email: email, Sujet: subject, Message: message, Statut: "NOUVEAU", Telephone: phone,
	}
	if _, err := db.Collection(models.SupportMessagesCollection).InsertOne(ctx, entry); err != nil {
		return nil, err
	}

	if strings.Contains(email, "@") {
		go func() {
			if err := d.Email.Send(email, "Reception de votre demande de support", supportConfirmationHTML(subject, phone, message)); err != nil {
				d.logAction(context.Background(), "contactSupport", models.LogStatusError, "Erreur email confirmation support: "+err.Error(), email)
			}
		}()
	}

	adminEmail := d.Env.SMTPFromEmail
	if adminEmail == "" && len(d.Env.SuperAdminEmails) > 0 {
		adminEmail = d.Env.SuperAdminEmails[0]
	}
	if adminEmail != "" {
		go func() {
			if err := d.Email.Send(adminEmail, fmt.Sprintf("[Mahu] %s - %s", subject, email), supportAdminHTML(subject, email, phone, message)); err != nil {
				d.logAction(context.Background(), "contactSupport", models.LogStatusError, "Erreur email admin support: "+err.Error(), email)
			}
		}()
	}

	go notify.SendWhatsApp(d.Env, fmt.Sprintf("[Mahu Support]\n\nDe: %s\nTel: %s\nSujet: %s\nMessage: %s", email, orDefault(phone, "N/A"), subject, message))

	return map[string]any{"success": true, "message": "Message envoye au support."}, nil
}

func orDefault(s, def string) string {
	if s == "" {
		return def
	}
	return s
}
