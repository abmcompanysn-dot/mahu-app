package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"html"
	"log"
	"net/http"
	"net/mail"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/config"
	"mahu-backend/internal/db"
	"mahu-backend/internal/emailutil"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/middleware"
	"mahu-backend/internal/models"
)

// Emailing (admin > Emailing): campaigns to existing clients sent from
// Brunel's or Fanny's mahu.cards mailbox, with a one-click rating link and
// an unsubscribe link in every email. Sending runs in the background, one
// email every outreachDelay, so a new list doesn't look like spam.
const (
	outreachDelay         = 4 * time.Second
	outreachMaxRecipients = 5000
)

var outreachRunning sync.Map // campaign id (hex) -> true while a goroutine sends it

func (d *Deps) outreachSender(email string) (config.OutreachSender, bool) {
	for _, s := range d.Env.OutreachSenders {
		if s.Email == strings.ToLower(strings.TrimSpace(email)) {
			return s, true
		}
	}
	return config.OutreachSender{}, false
}

func newOutreachToken() string {
	b := make([]byte, 18)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// personalize fills {prenom} / {nom}; without a first name "Bonjour {prenom},"
// becomes "Bonjour,".
func personalize(text, firstName, lastName string) string {
	r := strings.NewReplacer("{prenom}", firstName, "{Prenom}", firstName, "{nom}", lastName, "{Nom}", lastName)
	out := r.Replace(text)
	if firstName == "" || lastName == "" {
		out = strings.ReplaceAll(out, " ,", ",")
		out = strings.ReplaceAll(out, "  ", " ")
	}
	return out
}

func (d *Deps) outreachMessage(c models.OutreachCampaign, rcpt models.OutreachRecipient) emailutil.OutreachMessage {
	body := personalize(c.Body, rcpt.FirstName, rcpt.LastName)
	subject := personalize(c.Subject, rcpt.FirstName, rcpt.LastName)
	base := d.Env.PublicSiteURL + "/avis/" + rcpt.Token
	unsub := base + "?desinscription=1"

	var h strings.Builder
	h.WriteString(`<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2933;max-width:560px">`)
	for _, para := range strings.Split(strings.ReplaceAll(body, "\r\n", "\n"), "\n\n") {
		if strings.TrimSpace(para) == "" {
			continue
		}
		fmt.Fprintf(&h, `<p style="margin:0 0 14px">%s</p>`, strings.ReplaceAll(html.EscapeString(para), "\n", "<br>"))
	}
	if c.AskFeedback {
		h.WriteString(`<div style="margin:22px 0;padding:18px;border:1px solid #e4e7eb;border-radius:12px">`)
		h.WriteString(`<p style="margin:0 0 10px;font-weight:bold">Votre note, en un clic :</p><table role="presentation" cellspacing="0" cellpadding="0"><tr>`)
		for n := 1; n <= 5; n++ {
			fmt.Fprintf(&h, `<td style="padding-right:6px"><a href="%s?note=%d" style="display:inline-block;padding:9px 12px;border-radius:8px;background:#f1f5f9;color:#b7791f;font-size:16px;font-weight:bold;text-decoration:none">%d &#9733;</a></td>`, base, n, n)
		}
		h.WriteString(`</tr></table><p style="margin:8px 0 0;font-size:12px;color:#7b8794">1 = pas satisfait &middot; 5 = tres satisfait</p>`)
		fmt.Fprintf(&h, `<p style="margin:14px 0 0"><a href="%s" style="color:#007AFF">Ajouter un commentaire</a> ou simplement repondre a cet email.</p></div>`, base)
	}
	fmt.Fprintf(&h, `<p style="margin:18px 0 0">%s<br><span style="color:#7b8794">MAHU DIGITAL SYSTEM &middot; <a href="https://mahu.cards" style="color:#7b8794">mahu.cards</a></span></p>`, html.EscapeString(c.SenderName))
	fmt.Fprintf(&h, `<p style="margin:26px 0 0;font-size:11px;color:#9aa5b1">Vous recevez cet email en tant que client Mahu. <a href="%s" style="color:#9aa5b1">Ne plus recevoir ces emails</a></p></div>`, unsub)

	var t strings.Builder
	t.WriteString(body)
	if c.AskFeedback {
		fmt.Fprintf(&t, "\n\nVotre note en 30 secondes : %s\n(ou repondez simplement a cet email)", base)
	}
	fmt.Fprintf(&t, "\n\n%s\nMAHU DIGITAL SYSTEM - mahu.cards\n\nNe plus recevoir ces emails : %s\n", c.SenderName, unsub)

	return emailutil.OutreachMessage{To: rcpt.Email, Subject: subject, HTML: h.String(), Text: t.String(), UnsubscribeURL: unsub}
}

// ---- admin ----

func (d *Deps) AdminOutreachSenders(w http.ResponseWriter, r *http.Request) {
	senders := []map[string]string{}
	for _, s := range d.Env.OutreachSenders {
		senders = append(senders, map[string]string{"email": s.Email, "name": s.Name})
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"senders": senders})
}

type outreachCampaignInput struct {
	SenderEmail string `json:"senderEmail"`
	Subject     string `json:"subject"`
	Body        string `json:"body"`
	AskFeedback bool   `json:"askFeedback"`
	Recipients  []struct {
		Email     string `json:"email"`
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
	} `json:"recipients"`
	TestTo string `json:"testTo"`
}

func (in *outreachCampaignInput) clean() string {
	in.Subject = clip(in.Subject, 200)
	in.Body = strings.TrimSpace(in.Body)
	if len(in.Body) > 20000 {
		in.Body = in.Body[:20000]
	}
	if in.Subject == "" || in.Body == "" {
		return "Objet et message sont requis."
	}
	return ""
}

// AdminOutreachTest sends one sample of the email (first name "Test") to the
// admin, with links that point to a demo feedback page.
func (d *Deps) AdminOutreachTest(w http.ResponseWriter, r *http.Request) {
	var in outreachCampaignInput
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	if msg := in.clean(); msg != "" {
		httpx.WriteError(w, http.StatusBadRequest, msg)
		return
	}
	sender, ok := d.outreachSender(in.SenderEmail)
	if !ok {
		httpx.WriteError(w, http.StatusBadRequest, "Expediteur inconnu")
		return
	}
	to := strings.ToLower(strings.TrimSpace(in.TestTo))
	if _, err := mail.ParseAddress(to); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Adresse de test invalide")
		return
	}
	c := models.OutreachCampaign{SenderEmail: sender.Email, SenderName: sender.Name, Subject: "[TEST] " + in.Subject, Body: in.Body, AskFeedback: in.AskFeedback}
	rcpt := models.OutreachRecipient{Email: to, FirstName: "Test", Token: "test"}
	if err := emailutil.SendAs(d.Env, sender, d.outreachMessage(c, rcpt)); err != nil {
		log.Printf("[outreach] test send failed: %v", err)
		httpx.WriteError(w, http.StatusBadGateway, "Envoi impossible : "+err.Error())
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

// AdminCreateOutreachCampaign stores a draft with its cleaned recipient list
// (invalid, duplicate and unsubscribed addresses are left out and counted).
func (d *Deps) AdminCreateOutreachCampaign(w http.ResponseWriter, r *http.Request) {
	var in outreachCampaignInput
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	if msg := in.clean(); msg != "" {
		httpx.WriteError(w, http.StatusBadRequest, msg)
		return
	}
	sender, ok := d.outreachSender(in.SenderEmail)
	if !ok {
		httpx.WriteError(w, http.StatusBadRequest, "Expediteur inconnu")
		return
	}
	if len(in.Recipients) == 0 || len(in.Recipients) > outreachMaxRecipients {
		httpx.WriteError(w, http.StatusBadRequest, fmt.Sprintf("Entre 1 et %d destinataires.", outreachMaxRecipients))
		return
	}

	ctx := r.Context()
	unsubscribed := map[string]bool{}
	if cur, err := db.Collection(models.OutreachUnsubscribesCollection).Find(ctx, bson.M{}); err == nil {
		var rows []models.OutreachUnsubscribe
		_ = cur.All(ctx, &rows)
		for _, u := range rows {
			unsubscribed[u.Email] = true
		}
	}

	now := time.Now()
	campaign := models.OutreachCampaign{
		ID: primitive.NewObjectID(), SenderEmail: sender.Email, SenderName: sender.Name,
		Subject: in.Subject, Body: in.Body, AskFeedback: in.AskFeedback,
		Status: models.OutreachCampaignDraft, CreatedAt: now,
	}
	if claims, ok := middleware.Admin(r); ok {
		campaign.CreatedBy = claims.Email
	}

	seen := map[string]bool{}
	var docs []any
	invalid, duplicates, skipped := 0, 0, 0
	for _, rc := range in.Recipients {
		email := strings.ToLower(strings.Trim(strings.TrimSpace(rc.Email), "<>\"'"))
		if addr, err := mail.ParseAddress(email); err != nil || addr.Address != email || !strings.Contains(email[strings.Index(email, "@")+1:], ".") {
			invalid++
			continue
		}
		if seen[email] {
			duplicates++
			continue
		}
		seen[email] = true
		if unsubscribed[email] {
			skipped++
			continue
		}
		docs = append(docs, models.OutreachRecipient{
			ID: primitive.NewObjectID(), CampaignID: campaign.ID, Email: email,
			FirstName: clip(rc.FirstName, 80), LastName: clip(rc.LastName, 80),
			Token: newOutreachToken(), Status: models.OutreachRecipientPending,
		})
	}
	if len(docs) == 0 {
		httpx.WriteError(w, http.StatusBadRequest, "Aucune adresse valide dans la liste.")
		return
	}
	campaign.Total = len(docs)
	if _, err := db.Collection(models.OutreachCampaignsCollection).InsertOne(ctx, campaign); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if _, err := db.Collection(models.OutreachRecipientsCollection).InsertMany(ctx, docs); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, map[string]any{
		"_id": campaign.ID, "total": len(docs), "invalid": invalid, "duplicates": duplicates, "unsubscribed": skipped,
	})
}

type outreachStats struct {
	Pending      int     `json:"pending"`
	Sent         int     `json:"sent"`
	Failed       int     `json:"failed"`
	Unsubscribed int     `json:"unsubscribed"`
	Feedbacks    int     `json:"feedbacks"`
	AvgRating    float64 `json:"avgRating"`
}

func outreachStatsFor(ctx context.Context, ids []primitive.ObjectID) map[primitive.ObjectID]*outreachStats {
	out := map[primitive.ObjectID]*outreachStats{}
	for _, id := range ids {
		out[id] = &outreachStats{}
	}
	cur, err := db.Collection(models.OutreachRecipientsCollection).Aggregate(ctx, mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"campaignId": bson.M{"$in": ids}}}},
		{{Key: "$group", Value: bson.M{
			"_id":         bson.M{"c": "$campaignId", "s": "$status"},
			"n":           bson.M{"$sum": 1},
			"feedbacks":   bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$gt": bson.A{"$rating", 0}}, 1, 0}}},
			"ratingTotal": bson.M{"$sum": bson.M{"$ifNull": bson.A{"$rating", 0}}},
		}}},
	})
	if err != nil {
		return out
	}
	var rows []struct {
		ID struct {
			C primitive.ObjectID `bson:"c"`
			S string             `bson:"s"`
		} `bson:"_id"`
		N           int `bson:"n"`
		Feedbacks   int `bson:"feedbacks"`
		RatingTotal int `bson:"ratingTotal"`
	}
	_ = cur.All(ctx, &rows)
	totals := map[primitive.ObjectID]int{}
	for _, row := range rows {
		st := out[row.ID.C]
		if st == nil {
			continue
		}
		switch row.ID.S {
		case models.OutreachRecipientPending:
			st.Pending += row.N
		case models.OutreachRecipientSent:
			st.Sent += row.N
		case models.OutreachRecipientFailed:
			st.Failed += row.N
		case models.OutreachRecipientUnsubscribed:
			st.Unsubscribed += row.N
		}
		st.Feedbacks += row.Feedbacks
		totals[row.ID.C] += row.RatingTotal
	}
	for id, st := range out {
		if st.Feedbacks > 0 {
			st.AvgRating = float64(totals[id]) / float64(st.Feedbacks)
		}
	}
	return out
}

func (d *Deps) AdminListOutreachCampaigns(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cur, err := db.Collection(models.OutreachCampaignsCollection).Find(ctx, bson.M{},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(200))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	campaigns := []models.OutreachCampaign{}
	if err := cur.All(ctx, &campaigns); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	ids := make([]primitive.ObjectID, len(campaigns))
	for i, c := range campaigns {
		ids[i] = c.ID
	}
	stats := outreachStatsFor(ctx, ids)
	rows := make([]map[string]any, len(campaigns))
	for i, c := range campaigns {
		rows[i] = map[string]any{"campaign": c, "stats": stats[c.ID]}
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"campaigns": rows})
}

func (d *Deps) AdminGetOutreachCampaign(w http.ResponseWriter, r *http.Request, id string) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ID invalide")
		return
	}
	ctx := r.Context()
	var c models.OutreachCampaign
	if err := db.Collection(models.OutreachCampaignsCollection).FindOne(ctx, bson.M{"_id": objID}).Decode(&c); err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Campagne introuvable")
		return
	}
	cur, err := db.Collection(models.OutreachRecipientsCollection).Find(ctx, bson.M{"campaignId": objID},
		options.Find().SetSort(bson.D{{Key: "_id", Value: 1}}))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	recipients := []models.OutreachRecipient{}
	_ = cur.All(ctx, &recipients)
	_, running := outreachRunning.Load(c.ID.Hex())
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"campaign": c, "recipients": recipients, "stats": outreachStatsFor(ctx, []primitive.ObjectID{objID})[objID], "running": running,
	})
}

// AdminSendOutreachCampaign starts (or resumes) the background sending.
func (d *Deps) AdminSendOutreachCampaign(w http.ResponseWriter, r *http.Request, id string) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ID invalide")
		return
	}
	var c models.OutreachCampaign
	if err := db.Collection(models.OutreachCampaignsCollection).FindOne(r.Context(), bson.M{"_id": objID}).Decode(&c); err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Campagne introuvable")
		return
	}
	if _, ok := d.outreachSender(c.SenderEmail); !ok {
		httpx.WriteError(w, http.StatusBadRequest, "La boite de l'expediteur n'est plus configuree")
		return
	}
	set := bson.M{"status": models.OutreachCampaignSending}
	if c.StartedAt.IsZero() {
		set["startedAt"] = time.Now()
	}
	if _, err := db.Collection(models.OutreachCampaignsCollection).UpdateOne(r.Context(), bson.M{"_id": objID}, bson.M{"$set": set}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	go d.runOutreachCampaign(objID)
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

// AdminRetryOutreachFailed puts the failed recipients back in the queue.
func (d *Deps) AdminRetryOutreachFailed(w http.ResponseWriter, r *http.Request, id string) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ID invalide")
		return
	}
	res, err := db.Collection(models.OutreachRecipientsCollection).UpdateMany(r.Context(),
		bson.M{"campaignId": objID, "status": models.OutreachRecipientFailed},
		bson.M{"$set": bson.M{"status": models.OutreachRecipientPending}, "$unset": bson.M{"error": ""}})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true, "requeued": res.ModifiedCount})
}

// AdminDeleteOutreachCampaign removes a draft (never a campaign already sent:
// its feedback is kept).
func (d *Deps) AdminDeleteOutreachCampaign(w http.ResponseWriter, r *http.Request, id string) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ID invalide")
		return
	}
	res, err := db.Collection(models.OutreachCampaignsCollection).DeleteOne(r.Context(),
		bson.M{"_id": objID, "status": models.OutreachCampaignDraft})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if res.DeletedCount == 0 {
		httpx.WriteError(w, http.StatusBadRequest, "Seul un brouillon peut etre supprime")
		return
	}
	_, _ = db.Collection(models.OutreachRecipientsCollection).DeleteMany(r.Context(), bson.M{"campaignId": objID})
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (d *Deps) runOutreachCampaign(id primitive.ObjectID) {
	if _, busy := outreachRunning.LoadOrStore(id.Hex(), true); busy {
		return
	}
	defer outreachRunning.Delete(id.Hex())

	ctx := context.Background()
	campaigns := db.Collection(models.OutreachCampaignsCollection)
	recipients := db.Collection(models.OutreachRecipientsCollection)
	var c models.OutreachCampaign
	if err := campaigns.FindOne(ctx, bson.M{"_id": id}).Decode(&c); err != nil || c.Status != models.OutreachCampaignSending {
		return
	}
	sender, ok := d.outreachSender(c.SenderEmail)
	if !ok {
		log.Printf("[outreach] campaign %s: sender %s not configured", id.Hex(), c.SenderEmail)
		return
	}

	for {
		var rcpt models.OutreachRecipient
		err := recipients.FindOne(ctx, bson.M{"campaignId": id, "status": models.OutreachRecipientPending},
			options.FindOne().SetSort(bson.D{{Key: "_id", Value: 1}})).Decode(&rcpt)
		if err == mongo.ErrNoDocuments {
			_, _ = campaigns.UpdateOne(ctx, bson.M{"_id": id},
				bson.M{"$set": bson.M{"status": models.OutreachCampaignDone, "finishedAt": time.Now()}})
			log.Printf("[outreach] campaign %s done", id.Hex())
			return
		}
		if err != nil {
			log.Printf("[outreach] campaign %s: %v", id.Hex(), err)
			return
		}

		if n, _ := db.Collection(models.OutreachUnsubscribesCollection).CountDocuments(ctx, bson.M{"_id": rcpt.Email}); n > 0 {
			_, _ = recipients.UpdateOne(ctx, bson.M{"_id": rcpt.ID}, bson.M{"$set": bson.M{"status": models.OutreachRecipientUnsubscribed}})
			continue
		}

		set := bson.M{}
		if err := emailutil.SendAs(d.Env, sender, d.outreachMessage(c, rcpt)); err != nil {
			log.Printf("[outreach] %s -> %s failed: %v", c.SenderEmail, rcpt.Email, err)
			set["status"] = models.OutreachRecipientFailed
			set["error"] = clip(err.Error(), 300)
		} else {
			set["status"] = models.OutreachRecipientSent
			set["sentAt"] = time.Now()
		}
		_, _ = recipients.UpdateOne(ctx, bson.M{"_id": rcpt.ID}, bson.M{"$set": set})
		time.Sleep(outreachDelay)
	}
}

// ResumeOutreach restarts the campaigns that were sending when the backend
// stopped (pod restart, deploy).
func (d *Deps) ResumeOutreach(ctx context.Context) {
	cur, err := db.Collection(models.OutreachCampaignsCollection).Find(ctx, bson.M{"status": models.OutreachCampaignSending})
	if err != nil {
		return
	}
	var rows []models.OutreachCampaign
	_ = cur.All(ctx, &rows)
	for _, c := range rows {
		go d.runOutreachCampaign(c.ID)
	}
}

// ---- public (feedback page /avis/{token}) ----

func outreachRecipientByToken(ctx context.Context, token string) (models.OutreachRecipient, bool) {
	var rcpt models.OutreachRecipient
	if len(token) != 36 {
		return rcpt, false
	}
	err := db.Collection(models.OutreachRecipientsCollection).FindOne(ctx, bson.M{"token": token}).Decode(&rcpt)
	return rcpt, err == nil
}

func (d *Deps) GetOutreachFeedback(w http.ResponseWriter, r *http.Request, token string) {
	if token == "test" {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"firstName": "Test", "senderName": "Mahu", "test": true})
		return
	}
	rcpt, ok := outreachRecipientByToken(r.Context(), token)
	if !ok {
		httpx.WriteError(w, http.StatusNotFound, "Lien invalide ou expire")
		return
	}
	var c models.OutreachCampaign
	_ = db.Collection(models.OutreachCampaignsCollection).FindOne(r.Context(), bson.M{"_id": rcpt.CampaignID}).Decode(&c)
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"firstName": rcpt.FirstName, "senderName": c.SenderName, "rating": rcpt.Rating, "comment": rcpt.Comment,
		"unsubscribed": rcpt.Status == models.OutreachRecipientUnsubscribed,
	})
}

func (d *Deps) SubmitOutreachFeedback(w http.ResponseWriter, r *http.Request, token string) {
	var in struct {
		Rating  int    `json:"rating"`
		Comment string `json:"comment"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil || in.Rating < 1 || in.Rating > 5 {
		httpx.WriteError(w, http.StatusBadRequest, "Choisissez une note de 1 a 5")
		return
	}
	if token == "test" {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
		return
	}
	rcpt, ok := outreachRecipientByToken(r.Context(), token)
	if !ok {
		httpx.WriteError(w, http.StatusNotFound, "Lien invalide ou expire")
		return
	}
	comment := clip(in.Comment, 3000)
	set := bson.M{"rating": in.Rating, "feedbackAt": time.Now()}
	if comment != "" {
		set["comment"] = comment
	}
	if _, err := db.Collection(models.OutreachRecipientsCollection).UpdateOne(r.Context(), bson.M{"_id": rcpt.ID}, bson.M{"$set": set}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	// The sender sees each new rating or comment in their own mailbox.
	if (comment != "" && comment != rcpt.Comment) || rcpt.Rating != in.Rating {
		go func() {
			var c models.OutreachCampaign
			if err := db.Collection(models.OutreachCampaignsCollection).FindOne(context.Background(), bson.M{"_id": rcpt.CampaignID}).Decode(&c); err != nil {
				return
			}
			who := strings.TrimSpace(rcpt.FirstName + " " + rcpt.LastName)
			if who == "" {
				who = rcpt.Email
			}
			body := fmt.Sprintf("<p><b>%s</b> (%s) a donne la note <b>%d/5</b> a la campagne \"%s\".</p>",
				html.EscapeString(who), html.EscapeString(rcpt.Email), in.Rating, html.EscapeString(c.Subject))
			if comment != "" {
				body += "<p>Commentaire :<br>" + strings.ReplaceAll(html.EscapeString(comment), "\n", "<br>") + "</p>"
			}
			_ = d.Email.Send(c.SenderEmail, fmt.Sprintf("Avis client %d/5 - %s", in.Rating, who), body)
		}()
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (d *Deps) OutreachUnsubscribe(w http.ResponseWriter, r *http.Request, token string) {
	if token == "test" {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
		return
	}
	rcpt, ok := outreachRecipientByToken(r.Context(), token)
	if !ok {
		httpx.WriteError(w, http.StatusNotFound, "Lien invalide ou expire")
		return
	}
	ctx := r.Context()
	_, err := db.Collection(models.OutreachUnsubscribesCollection).UpdateOne(ctx, bson.M{"_id": rcpt.Email},
		bson.M{"$setOnInsert": bson.M{"createdAt": time.Now()}}, options.Update().SetUpsert(true))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	_, _ = db.Collection(models.OutreachRecipientsCollection).UpdateOne(ctx,
		bson.M{"_id": rcpt.ID, "status": bson.M{"$in": bson.A{models.OutreachRecipientSent, models.OutreachRecipientPending}}},
		bson.M{"$set": bson.M{"status": models.OutreachRecipientUnsubscribed}})
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}
