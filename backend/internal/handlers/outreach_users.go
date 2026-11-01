package handlers

import (
	"net/http"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/models"
)

type outreachUserRow struct {
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

// AdminOutreachAllUsers returns every Mahu account with an email (disabled
// accounts excepted) as an Emailing recipient list, for campaigns sent to all
// users ("Bon debut de mois"...). Unsubscribed addresses are still removed
// when the campaign is created.
func (d *Deps) AdminOutreachAllUsers(w http.ResponseWriter, r *http.Request) {
	cursor, err := db.Collection(models.UsersCollection).Find(r.Context(),
		bson.M{"email": bson.M{"$nin": bson.A{"", nil}}, "disabled": bson.M{"$ne": true}},
		options.Find().SetProjection(bson.M{"email": 1, "name": 1}).SetLimit(outreachMaxRecipients))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	var users []models.User
	if err := cursor.All(r.Context(), &users); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	seen := map[string]bool{}
	rows := make([]outreachUserRow, 0, len(users))
	for _, u := range users {
		email := strings.ToLower(strings.TrimSpace(u.Email))
		if email == "" || seen[email] {
			continue
		}
		seen[email] = true
		first, last, _ := strings.Cut(strings.TrimSpace(u.Name), " ")
		rows = append(rows, outreachUserRow{Email: email, FirstName: first, LastName: strings.TrimSpace(last)})
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"recipients": rows})
}
