package handlers

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/db"
	"mahu-backend/internal/models"
)

// legacyGetTeamCards lists every employee card (User + Profile) belonging to
// the calling enterprise account, for the enterprise back-office's team view.
func (d *Deps) legacyGetTeamCards(ctx context.Context, adminUser *models.User) (map[string]any, error) {
	if !isEnterpriseStaff(adminUser.Role) {
		return map[string]any{"success": false, "error": "Action reservee aux comptes Entreprise."}, nil
	}

	cursor, err := db.Collection(models.UsersCollection).Find(ctx, bson.M{"enterpriseId": adminUser.ID.Hex()})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var employees []models.User
	if err := cursor.All(ctx, &employees); err != nil {
		return nil, err
	}

	cards := make([]map[string]any, 0, len(employees))
	for _, employee := range employees {
		profile, err := findProfileByUserID(ctx, employee.ID)
		if err != nil {
			return nil, err
		}
		card := userToMap(&employee)
		for k, v := range profileToMap(profile) {
			card[k] = v
		}
		cards = append(cards, card)
	}

	return map[string]any{"success": true, "cards": cards}, nil
}

func isEnterpriseStaff(role string) bool {
	return role == models.RoleEntreprise || role == models.RoleAdmin
}

func (d *Deps) legacyCreateEmployee(ctx context.Context, payload map[string]any, adminUser *models.User) (map[string]any, error) {
	if !isEnterpriseStaff(adminUser.Role) {
		return nil, errors.New("Seuls les comptes Entreprise peuvent creer des employes.")
	}

	email := str(payload, "email")
	password := str(payload, "password")
	name := str(payload, "name")

	existing, err := findUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	if existing != nil {
		if existing.EnterpriseID != "" {
			if existing.EnterpriseID == adminUser.ID.Hex() {
				return map[string]any{"success": false, "error": "Cet utilisateur fait deja partie de votre equipe."}, nil
			}
			return map[string]any{"success": false, "error": "Cet email est deja associe a une autre entreprise."}, nil
		}

		if _, err := db.Collection(models.UsersCollection).UpdateOne(ctx, bson.M{"_id": existing.ID},
			bson.M{"$set": bson.M{"enterpriseId": adminUser.ID.Hex(), "role": models.RoleEmploye, "updatedAt": time.Now()}}); err != nil {
			return nil, err
		}
		return map[string]any{"success": true, "message": "Utilisateur existant ajoute a votre equipe avec succes."}, nil
	}

	registerResult, err := d.legacyRegisterUser(ctx, email, password, adminUser.ID.Hex(), "")
	if err != nil {
		return nil, err
	}
	if success, _ := registerResult["success"].(bool); !success {
		return registerResult, nil
	}

	if newUser, err := findUserByEmail(ctx, email); err == nil && newUser != nil && name != "" {
		_, _ = db.Collection(models.ProfilesCollection).UpdateOne(ctx, bson.M{"userId": newUser.ID},
			bson.M{"$set": bson.M{"nomComplet": name, "updatedAt": time.Now()}})
	}

	return map[string]any{"success": true, "message": "Employe cree avec succes."}, nil
}

func (d *Deps) legacyDeleteEmployee(ctx context.Context, payload map[string]any, adminUser *models.User) (map[string]any, error) {
	if !isEnterpriseStaff(adminUser.Role) {
		return map[string]any{"success": false, "error": "Action reservee aux comptes Entreprise."}, nil
	}

	targetEmail := str(payload, "email")
	if targetEmail == "" {
		return map[string]any{"success": false, "error": "Email de l'employe requis."}, nil
	}

	target, err := findUserByEmail(ctx, targetEmail)
	if err != nil {
		return nil, err
	}
	if target == nil {
		return map[string]any{"success": false, "error": "Employe introuvable."}, nil
	}
	if target.EnterpriseID != adminUser.ID.Hex() {
		return map[string]any{"success": false, "error": "Cet utilisateur ne fait pas partie de votre equipe."}, nil
	}

	if _, err := db.Collection(models.UsersCollection).DeleteOne(ctx, bson.M{"_id": target.ID}); err != nil {
		return nil, err
	}

	return map[string]any{"success": true, "message": "Employe supprime avec succes."}, nil
}

func (d *Deps) legacySaveEnterpriseInfo(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	if !isEnterpriseStaff(user.Role) {
		return map[string]any{"success": false, "error": "Action reservee aux comptes Entreprise."}, nil
	}

	profileData := map[string]any{
		"Compagnie": str(payload, "name"),
		"Telephone": str(payload, "phone"),
		"Location":  str(payload, "address"),
	}
	return d.legacySaveProfile(ctx, profileData, user)
}

// legacyGetTeamProspects gathers the contacts collected by every card of the
// enterprise (its employees and its own), newest first, with who met them -
// the "Contacts de l'equipe" view of the enterprise back-office.
func (d *Deps) legacyGetTeamProspects(ctx context.Context, adminUser *models.User) (map[string]any, error) {
	if !isEnterpriseStaff(adminUser.Role) {
		return map[string]any{"success": false, "error": "Action reservee aux comptes Entreprise."}, nil
	}

	cursor, err := db.Collection(models.UsersCollection).Find(ctx, bson.M{"enterpriseId": adminUser.ID.Hex()})
	if err != nil {
		return nil, err
	}
	var employees []models.User
	if err := cursor.All(ctx, &employees); err != nil {
		return nil, err
	}
	members := append([]models.User{*adminUser}, employees...)

	type memberInfo struct{ name, email string }
	byID := map[primitive.ObjectID]memberInfo{}
	ids := make([]primitive.ObjectID, 0, len(members))
	for _, m := range members {
		name := m.Name
		if profile, err := findProfileByUserID(ctx, m.ID); err == nil && profile != nil && profile.NomComplet != "" {
			name = profile.NomComplet
		}
		if name == "" {
			name = emailPrefix(m.Email)
		}
		byID[m.ID] = memberInfo{name: name, email: m.Email}
		ids = append(ids, m.ID)
	}

	pc, err := db.Collection(models.ProspectsCollection).Find(ctx, bson.M{"profileOwnerId": bson.M{"$in": ids}},
		options.Find().SetSort(bson.D{{Key: "dateCapture", Value: -1}}).SetLimit(2000))
	if err != nil {
		return nil, err
	}
	var prospects []models.Prospect
	if err := pc.All(ctx, &prospects); err != nil {
		return nil, err
	}

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekAgo := now.AddDate(0, 0, -7)

	type memberStats struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Today int    `json:"today"`
		Week  int    `json:"week"`
		Total int    `json:"total"`
	}
	stats := map[primitive.ObjectID]*memberStats{}
	for _, id := range ids {
		info := byID[id]
		stats[id] = &memberStats{Name: info.name, Email: info.email}
	}

	rows := make([]map[string]any, 0, len(prospects))
	ratingSum, ratingCount, today, week := 0, 0, 0, 0
	for _, p := range prospects {
		st := stats[p.ProfileOwnerID]
		st.Total++
		if p.DateCapture.After(weekAgo) {
			st.Week++
			week++
		}
		if !p.DateCapture.Before(startOfDay) {
			st.Today++
			today++
		}
		if p.NoteEtoiles > 0 {
			ratingSum += p.NoteEtoiles
			ratingCount++
		}
		rows = append(rows, map[string]any{
			"date": p.DateCapture, "nom": p.Nom, "contact": p.Contact, "message": p.Message,
			"note": p.NoteEtoiles, "canal": p.Canal,
			"employeeName": byID[p.ProfileOwnerID].name, "employeeEmail": byID[p.ProfileOwnerID].email,
		})
	}

	members2 := make([]*memberStats, 0, len(ids))
	for _, id := range ids {
		members2 = append(members2, stats[id])
	}
	avg := 0.0
	if ratingCount > 0 {
		avg = float64(ratingSum) / float64(ratingCount)
	}

	return map[string]any{
		"success":   true,
		"prospects": rows,
		"members":   members2,
		"totals":    map[string]any{"today": today, "week": week, "total": len(prospects), "avgRating": avg, "ratingCount": ratingCount},
	}, nil
}
