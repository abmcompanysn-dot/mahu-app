package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"mahu-backend/internal/db"
)

// Kit de communication : chaque matin a 7 h (Dakar = UTC), un email rappelle
// la publication du jour et renvoie vers call.mahu.cards/kit?jour=AAAA-MM-JJ,
// ou se trouvent l'image, le texte et les hashtags a copier. Le planning est
// public/kit/plan.json du frontend : une seule source pour la page et l'email.

const (
	kitSendsCollection = "kit_daily_sends"
	kitSendHourUTC     = 7
)

type kitImage struct {
	Label string `json:"label"`
	Src   string `json:"src"`
}

type kitDay struct {
	Date     string     `json:"date"`
	Title    string     `json:"title"`
	Theme    string     `json:"theme"`
	Images   []kitImage `json:"images"`
	Caption  string     `json:"caption"`
	Hashtags string     `json:"hashtags"`
	Channels []string   `json:"channels"`
	Tip      string     `json:"tip"`
}

type kitPlan struct {
	Days []kitDay `json:"days"`
}

func kitBaseURL() string {
	if v := strings.TrimSpace(os.Getenv("KIT_BASE_URL")); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "https://call.mahu.cards"
}

// kitRecipients: KIT_EMAILS (separes par des virgules), sinon l'adresse admin.
func kitRecipients() []string {
	var out []string
	for _, e := range strings.Split(os.Getenv("KIT_EMAILS"), ",") {
		if e = strings.TrimSpace(e); e != "" {
			out = append(out, e)
		}
	}
	if len(out) == 0 {
		out = []string{"abmcompanysn@gmail.com"}
	}
	return out
}

func (d *Deps) RunKitDaily(ctx context.Context) {
	t := time.NewTicker(10 * time.Minute)
	defer t.Stop()
	for {
		d.sendKitOfTheDay(ctx, time.Now().UTC())
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
	}
}

func (d *Deps) sendKitOfTheDay(ctx context.Context, now time.Time) {
	if now.Hour() < kitSendHourUTC {
		return
	}
	date := now.Format("2006-01-02")
	day, err := fetchKitDay(ctx, date)
	if err != nil {
		log.Printf("kit: planning indisponible: %v", err)
		return
	}
	if day == nil {
		return
	}
	// Un seul envoi par jour, meme avec plusieurs instances du backend.
	coll := db.Collection(kitSendsCollection)
	if _, err := coll.InsertOne(ctx, bson.M{"_id": date, "title": day.Title, "sentAt": now}); err != nil {
		if !mongo.IsDuplicateKeyError(err) {
			log.Printf("kit: verrou du %s impossible: %v", date, err)
		}
		return
	}
	subject, body := kitEmail(day)
	sent := 0
	for _, to := range kitRecipients() {
		if err := d.Email.Send(to, subject, body); err != nil {
			log.Printf("kit: email du %s non envoye a %s: %v", date, to, err)
			continue
		}
		sent++
	}
	if sent == 0 {
		// Rien n'est parti : on libere le verrou pour reessayer au prochain tour.
		_, _ = coll.DeleteOne(ctx, bson.M{"_id": date})
		return
	}
	log.Printf("kit: publication du %s envoyee (%d destinataire(s))", date, sent)
}

func fetchKitDay(ctx context.Context, date string) (*kitDay, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, kitBaseURL()+"/kit/plan.json", nil)
	if err != nil {
		return nil, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("statut %d", resp.StatusCode)
	}
	var plan kitPlan
	if err := json.NewDecoder(resp.Body).Decode(&plan); err != nil {
		return nil, err
	}
	for i := range plan.Days {
		if plan.Days[i].Date == date {
			return &plan.Days[i], nil
		}
	}
	return nil, nil
}

func kitEmail(day *kitDay) (string, string) {
	base := kitBaseURL()
	link := base + "/kit?jour=" + day.Date
	when, err := time.Parse("2006-01-02", day.Date)
	dateLabel := day.Date
	if err == nil {
		dateLabel = fmt.Sprintf("%s %d %s", frenchWeekdays[when.Weekday()], when.Day(), frenchMonths[when.Month()-1])
	}
	image := ""
	if len(day.Images) > 0 {
		image = fmt.Sprintf(`<a href="%s"><img src="%s" alt="" width="520" style="display:block;width:100%%;max-width:520px;border-radius:14px;margin:18px 0"></a>`,
			html.EscapeString(link), html.EscapeString(base+day.Images[0].Src))
	}
	caption := html.EscapeString(day.Caption)
	if len([]rune(day.Caption)) > 420 {
		caption = html.EscapeString(string([]rune(day.Caption)[:420])) + "…"
	}
	caption = strings.ReplaceAll(caption, "\n", "<br>")
	tip := ""
	if day.Tip != "" {
		tip = fmt.Sprintf(`<p style="background:#fff7e0;border-radius:10px;padding:12px 14px;font-size:14px;color:#6b4e00">💡 %s</p>`, html.EscapeString(day.Tip))
	}
	body := fmt.Sprintf(`<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#007AFF;font-weight:bold;margin:0">Kit de communication MAHU</p>
<h1 style="font-size:24px;margin:8px 0 4px">%s</h1>
<p style="margin:0;color:#666;font-size:14px">%s · %s</p>
%s
<p style="font-size:15px;line-height:1.55;color:#333">%s</p>
<p style="font-size:14px;color:#007AFF;font-weight:bold">%s</p>
<p style="font-size:14px;color:#333"><b>Où publier :</b> %s</p>
%s
<p style="text-align:center;margin:26px 0"><a href="%s" style="background:#007AFF;color:#fff;text-decoration:none;font-weight:bold;padding:15px 28px;border-radius:999px;display:inline-block">Ouvrir la publication du jour</a></p>
<p style="font-size:12px;color:#999;text-align:center">Sur la page : téléchargez l'image, copiez le texte et les hashtags, puis cochez les réseaux où vous avez publié.</p>
</div>`,
		html.EscapeString(day.Title), dateLabel, html.EscapeString(day.Theme), image, caption,
		html.EscapeString(day.Hashtags), html.EscapeString(strings.Join(day.Channels, " · ")), tip, html.EscapeString(link))
	return "À publier aujourd'hui : " + day.Title, body
}

var frenchWeekdays = [...]string{"Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"}
var frenchMonths = [...]string{"janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"}
