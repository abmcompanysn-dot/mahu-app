package handlers

import (
	"context"
	"fmt"
	"html"
	"net/url"
	"os"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"mahu-backend/internal/db"
	"mahu-backend/internal/legacyauth"
	"mahu-backend/internal/models"
	"mahu-backend/internal/notify"
)

// Every blank card activation must be confirmed by Mahu: the approver gets an
// email with Confirmer / Refuser, and without an answer within
// blankCardReviewDelay the account is disabled and its public page hidden.
// A late confirmation turns it back on.

const (
	blankCardPending   = "en_attente"
	blankCardConfirmed = "confirmee"
	blankCardRefused   = "refusee"
	blankCardExpired   = "expiree"

	blankCardReviewDelay = 2 * time.Hour
)

// BLANK_CARD_APPROVER overrides the address that confirms activations.
func blankCardApprover() string {
	if v := strings.TrimSpace(os.Getenv("BLANK_CARD_APPROVER")); v != "" {
		return v
	}
	return "abmcompanysn@gmail.com"
}

// blankCardHidden: the public profile of a refused or expired activation is
// not shown.
func blankCardHidden(u *models.User) bool {
	return u.BlankCardApproval == blankCardRefused || u.BlankCardApproval == blankCardExpired
}

// requestBlankCardReview marks the new account as waiting and emails the
// approver. Called right after legacyActivateBlankCard created it.
func (d *Deps) requestBlankCardReview(ctx context.Context, user *models.User, details [][2]string) error {
	token, err := legacyauth.NewUUID()
	if err != nil {
		return err
	}
	deadline := time.Now().Add(blankCardReviewDelay)
	if _, err := db.Collection(models.UsersCollection).UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{
		"blankCardApproval": blankCardPending, "blankCardDeadline": deadline, "blankCardToken": token,
	}}); err != nil {
		return err
	}

	link := func(decision string) string {
		return d.Env.AppURL + "/activation/confirmer?token=" + url.QueryEscape(token) + "&decision=" + decision
	}
	rows := ""
	for _, kv := range details {
		if kv[1] != "" {
			rows += fmt.Sprintf(`<tr><td style="padding:4px 12px 4px 0;color:#666;">%s</td><td style="padding:4px 0;font-weight:600;">%s</td></tr>`, kv[0], html.EscapeString(kv[1]))
		}
	}
	body := fmt.Sprintf(`
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
  <h2 style="margin:0 0 8px;">Nouvelle carte vierge activee</h2>
  <p style="margin:0 0 16px;color:#555;">A confirmer avant le <strong>%s</strong> (heure de Dakar). Sans confirmation, le compte sera desactive automatiquement.</p>
  <table style="border-collapse:collapse;margin-bottom:20px;">%s</table>
  <a href="%s" style="background:#11804a;color:#fff;padding:12px 22px;text-decoration:none;font-weight:600;display:inline-block;border-radius:6px;margin-right:8px;">Confirmer l'activation</a>
  <a href="%s" style="background:#c53030;color:#fff;padding:12px 22px;text-decoration:none;font-weight:600;display:inline-block;border-radius:6px;">Refuser</a>
</div>`, deadline.UTC().Format("02/01/2006 a 15:04"), rows, link("confirmer"), link("refuser"))

	go func() {
		if err := d.Email.Send(blankCardApprover(), "A confirmer : carte Mahu activee ("+user.ProfileURL+")", body); err != nil {
			d.logAction(context.Background(), "activateBlankCard", models.LogStatusError, "Email de confirmation non envoye: "+err.Error(), user.Email)
		}
	}()
	return nil
}

// legacyReviewBlankCard is the public "reviewBlankCard" action behind the
// links of the confirmation email (page /activation/confirmer).
func (d *Deps) legacyReviewBlankCard(ctx context.Context, token, decision string) (map[string]any, error) {
	token = strings.TrimSpace(token)
	if token == "" || (decision != "confirmer" && decision != "refuser") {
		return map[string]any{"success": false, "error": "Lien invalide."}, nil
	}
	var user models.User
	if err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"blankCardToken": token}).Decode(&user); err != nil {
		return map[string]any{"success": false, "error": "Lien invalide ou deja utilise."}, nil
	}

	set := bson.M{"updatedAt": time.Now()}
	if decision == "confirmer" {
		set["blankCardApproval"], set["disabled"] = blankCardConfirmed, false
	} else {
		set["blankCardApproval"], set["disabled"] = blankCardRefused, true
	}
	if _, err := db.Collection(models.UsersCollection).UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
		"$set": set, "$unset": bson.M{"blankCardToken": "", "blankCardDeadline": ""},
	}); err != nil {
		return nil, err
	}
	_ = db.InvalidateCache(ctx, profileCacheKey(user.ProfileURL))

	label := "confirmee"
	if decision == "refuser" {
		label = "refusee : compte desactive"
	}
	d.logAction(ctx, "reviewBlankCard", models.LogStatusSuccess, "Activation "+label+" ("+user.ProfileURL+")", user.Email)
	return map[string]any{"success": true, "decision": decision, "email": user.Email, "profileUrl": user.ProfileURL}, nil
}

// ExpireBlankCardActivations disables the activations left unconfirmed past
// their deadline. Run every few minutes by cmd/server.
func (d *Deps) ExpireBlankCardActivations(ctx context.Context) {
	coll := db.Collection(models.UsersCollection)
	cur, err := coll.Find(ctx, bson.M{"blankCardApproval": blankCardPending, "blankCardDeadline": bson.M{"$lt": time.Now()}})
	if err != nil {
		return
	}
	defer cur.Close(ctx)
	for cur.Next(ctx) {
		var user models.User
		if cur.Decode(&user) != nil {
			continue
		}
		res, err := coll.UpdateOne(ctx, bson.M{"_id": user.ID, "blankCardApproval": blankCardPending}, bson.M{"$set": bson.M{
			"blankCardApproval": blankCardExpired, "disabled": true, "updatedAt": time.Now(),
		}})
		if err != nil || res.ModifiedCount == 0 {
			continue
		}
		_ = db.InvalidateCache(ctx, profileCacheKey(user.ProfileURL))
		d.logAction(ctx, "reviewBlankCard", models.LogStatusError, "Activation non confirmee en 2 h : compte desactive ("+user.ProfileURL+")", user.Email)
		notify.SendWhatsApp(d.Env, fmt.Sprintf("Carte %s : activation non confirmee en 2 h, compte %s desactive. Le lien Confirmer de l'e-mail le reactive.", user.ProfileURL, user.Email))
	}
}

// RunBlankCardExpiry checks the deadlines every 5 minutes until ctx ends.
func (d *Deps) RunBlankCardExpiry(ctx context.Context) {
	t := time.NewTicker(5 * time.Minute)
	defer t.Stop()
	for {
		d.ExpireBlankCardActivations(ctx)
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
	}
}
