package handlers

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"

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

	registerResult, err := d.legacyRegisterUser(ctx, email, password, adminUser.ID.Hex())
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
