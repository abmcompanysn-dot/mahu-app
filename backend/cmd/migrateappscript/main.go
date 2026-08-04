// One-time migration: pulls every row out of the Google Sheets/Apps Script
// backend (via a new adminExportAllData action - see the snippet you need to
// add to Code.gs, given alongside this file) and imports it into MongoDB,
// preserving password hashes as-is (both the salted and legacy-plaintext
// formats are still understood by internal/legacyauth.VerifyPassword, so no
// existing user gets locked out) and remapping every ID_Unique/ID_* cross
// reference to the new Mongo ObjectIDs.
//
// Usage:
//
//	./migrateappscript -appscript-url=https://script.google.com/macros/s/XXX/exec \
//	  -email=admin@example.com -password=... -mongo-uri=mongodb://...
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"mahu-backend/internal/db"
	"mahu-backend/internal/models"
)

type sheetRow = map[string]any

type exportData struct {
	Utilisateurs   []sheetRow `json:"Utilisateurs"`
	Profils        []sheetRow `json:"Profils"`
	Prospects      []sheetRow `json:"Prospects"`
	Documents      []sheetRow `json:"Documents"`
	Support        []sheetRow `json:"Support"`
	PhysicalCards  []sheetRow `json:"PhysicalCards"`
	Resellers      []sheetRow `json:"Resellers"`
	Commandes      []sheetRow `json:"Commandes"`
	CommandesCustom []sheetRow `json:"Commandes_Custom"`
	Statistiques   []sheetRow `json:"Statistiques"`
}

func callAppScript(appscriptURL, action, token string, extra map[string]string) (map[string]any, error) {
	form := url.Values{}
	form.Set("action", action)
	if token != "" {
		form.Set("token", token)
	}
	if len(extra) > 0 {
		payload, _ := json.Marshal(extra)
		form.Set("payload", string(payload))
	}

	resp, err := http.Post(appscriptURL, "application/x-www-form-urlencoded", bytes.NewBufferString(form.Encode()))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result map[string]any
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("reponse non-JSON de l'AppScript: %s", string(body[:min(len(body), 300)]))
	}
	return result, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func s(row sheetRow, key string) string {
	if v, ok := row[key].(string); ok {
		return v
	}
	return ""
}

func main() {
	appscriptURL := flag.String("appscript-url", "", "URL du Web App Google Apps Script (voir Deployer > Gerer les deploiements)")
	email := flag.String("email", "", "Email d'un compte super-admin existant sur l'AppScript")
	password := flag.String("password", "", "Mot de passe de ce compte")
	mongoURI := flag.String("mongo-uri", os.Getenv("MONGO_URI"), "URI MongoDB de destination")
	flag.Parse()

	if *appscriptURL == "" || *email == "" || *password == "" || *mongoURI == "" {
		fmt.Fprintln(os.Stderr, "Usage: migrateappscript -appscript-url=... -email=... -password=... -mongo-uri=...")
		os.Exit(1)
	}

	fmt.Println("1/4 - Connexion a MongoDB...")
	if err := db.ConnectMongo(*mongoURI); err != nil {
		fatal(err)
	}

	fmt.Println("2/4 - Authentification aupres de l'AppScript...")
	loginResult, err := callAppScript(*appscriptURL, "loginUser", "", map[string]string{"email": *email, "password": *password})
	if err != nil {
		fatal(err)
	}
	if success, _ := loginResult["success"].(bool); !success {
		fatal(fmt.Errorf("echec de connexion: %v", loginResult["error"]))
	}
	token, _ := loginResult["token"].(string)

	fmt.Println("3/4 - Export des donnees (peut prendre plusieurs minutes)...")
	rawExport, err := callAppScript(*appscriptURL, "adminExportAllData", token, nil)
	if err != nil {
		fatal(err)
	}
	if errMsg, ok := rawExport["error"].(string); ok && errMsg != "" {
		fatal(fmt.Errorf("export refuse: %s", errMsg))
	}
	rawJSON, _ := json.Marshal(rawExport)
	var export exportData
	if err := json.Unmarshal(rawJSON, &export); err != nil {
		fatal(err)
	}

	fmt.Println("4/4 - Import dans MongoDB...")
	if err := importAll(context.Background(), export); err != nil {
		fatal(err)
	}

	fmt.Println("Migration terminee avec succes.")
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, "Erreur:", err)
	os.Exit(1)
}

func importAll(ctx context.Context, export exportData) error {
	idMap := map[string]primitive.ObjectID{}

	// Pass 1: users, without EnterpriseID (needs the full map first).
	type pendingUser struct {
		user           models.User
		oldEnterpriseID string
	}
	pending := make([]pendingUser, 0, len(export.Utilisateurs))

	for _, row := range export.Utilisateurs {
		oldID := s(row, "ID_Unique")
		if oldID == "" {
			continue
		}
		newID := primitive.NewObjectID()
		idMap[oldID] = newID

		var nfcCards []string
		if raw := s(row, "ID_Cartes_NFC"); raw != "" {
			_ = json.Unmarshal([]byte(raw), &nfcCards)
		}

		now := time.Now()
		user := models.User{
			ID: newID, Email: strings.ToLower(s(row, "Email")), Role: s(row, "Role"),
			PasswordHash: s(row, "Mot_De_Passe"), ProfileURL: s(row, "URL_Profil"),
			ProfileURL2: s(row, "URL_Profil_2"), ProfileURL3: s(row, "URL_Profil_3"),
			NfcCardIDs: nfcCards, OnboardingStatus: s(row, "Onboarding_Status"),
			CreatedAt: now, UpdatedAt: now,
		}
		pending = append(pending, pendingUser{user: user, oldEnterpriseID: s(row, "ID_Entreprise")})
	}

	for _, p := range pending {
		user := p.user
		if p.oldEnterpriseID != "" {
			if newEntID, ok := idMap[p.oldEnterpriseID]; ok {
				user.EnterpriseID = newEntID.Hex()
			}
		}
		if _, err := db.Collection(models.UsersCollection).InsertOne(ctx, user); err != nil {
			return fmt.Errorf("user %s: %w", user.Email, err)
		}
	}
	fmt.Printf("  - %d utilisateurs importes\n", len(pending))

	profileCount := 0
	for _, row := range export.Profils {
		oldUserID := s(row, "ID_Utilisateur")
		newUserID, ok := idMap[oldUserID]
		if !ok {
			continue
		}
		now := time.Now()
		profile := models.Profile{
			ID: primitive.NewObjectID(), UserID: newUserID, Email: strings.ToLower(s(row, "Email")),
			NomComplet: s(row, "Nom_Complet"), Telephone: s(row, "Telephone"), Profession: s(row, "Profession"),
			Compagnie: s(row, "Compagnie"), Location: s(row, "Location"), URLPhoto: s(row, "URL_Photo"),
			URLCouverture: s(row, "URL_Couverture"), LiensSociauxJSON: orDefaultStr(s(row, "Liens_Sociaux_JSON"), "[]"),
			LeadCaptureActif: orDefaultStr(s(row, "Lead_Capture_Actif"), "NON"), ServicesJSON: orDefaultStr(s(row, "Services_JSON"), "[]"),
			MiseEnPage: s(row, "Mise_En_Page"), CouleurTheme: s(row, "Couleur_Theme"), CacherMarque: s(row, "Cacher_Marque"),
			Langue: s(row, "Langue"), RedirectionSiteWeb: s(row, "Redirection_Site_Web"), CreatedAt: now, UpdatedAt: now,
		}
		if _, err := db.Collection(models.ProfilesCollection).InsertOne(ctx, profile); err != nil {
			return fmt.Errorf("profile for %s: %w", profile.Email, err)
		}
		profileCount++
	}
	fmt.Printf("  - %d profils importes\n", profileCount)

	prospectCount := 0
	for _, row := range export.Prospects {
		oldOwnerID := s(row, "ID_Profil_Source")
		newOwnerID, ok := idMap[oldOwnerID]
		if !ok {
			continue
		}
		prospect := models.Prospect{
			ProfileOwnerID: newOwnerID, DateCapture: parseTime(row["Date_Capture"]),
			Nom: s(row, "Nom_Prospect"), Contact: s(row, "Contact_Prospect"), Message: s(row, "Message_Note"),
			NoteEtoiles: parseInt(row["Note_Etoiles"]), Canal: orDefaultStr(s(row, "Canal"), "Profil"),
		}
		if _, err := db.Collection(models.ProspectsCollection).InsertOne(ctx, prospect); err != nil {
			return err
		}
		prospectCount++
	}
	fmt.Printf("  - %d prospects importes\n", prospectCount)

	docCount := 0
	for _, row := range export.Documents {
		newUserID, ok := idMap[s(row, "ID_Utilisateur")]
		if !ok {
			continue
		}
		doc := models.LegacyDocument{
			ID: primitive.NewObjectID(), UserID: newUserID, Type: s(row, "Type"), Nom: s(row, "Nom"),
			URL: s(row, "URL"), DateAjout: parseTime(row["Date_Ajout"]),
		}
		if _, err := db.Collection(models.LegacyDocumentsCollection).InsertOne(ctx, doc); err != nil {
			return err
		}
		docCount++
	}
	fmt.Printf("  - %d documents importes\n", docCount)

	for _, row := range export.Support {
		entry := models.SupportMessage{
			Date: parseTime(row["Date"]), Email: s(row, "Email"), Sujet: s(row, "Sujet"),
			Message: s(row, "Message"), Statut: s(row, "Statut"), Telephone: s(row, "Telephone"),
		}
		if _, err := db.Collection(models.SupportMessagesCollection).InsertOne(ctx, entry); err != nil {
			return err
		}
	}
	fmt.Printf("  - %d messages de support importes\n", len(export.Support))

	for _, row := range export.PhysicalCards {
		card := models.PhysicalCard{
			CodeCarte: s(row, "Code_Carte"), EmailProprietaire: s(row, "Email_Proprietaire"),
			Statut: orDefaultStr(s(row, "Statut"), models.CardStatusBlank), Vendeur: s(row, "Vendeur"),
			Commentaire: s(row, "Commentaire"),
		}
		if t := parseTimePtr(row["Date_Activation"]); t != nil {
			card.DateActivation = t
		}
		if t := parseTimePtr(row["Date_Vente"]); t != nil {
			card.DateVente = t
		}
		if _, err := db.Collection(models.PhysicalCardsCollection).InsertOne(ctx, card); err != nil {
			return err
		}
	}
	fmt.Printf("  - %d cartes physiques importees\n", len(export.PhysicalCards))

	for _, row := range export.Resellers {
		reseller := models.Reseller{
			Email: s(row, "Email"), NomEntreprise: s(row, "Nom_Entreprise"), ContactTel: s(row, "Contact_Tel"),
			TotalCartes: parseInt(row["Total_Cartes"]), StatutPartenaire: s(row, "Statut_Partenaire"),
		}
		if _, err := db.Collection(models.ResellersCollection).InsertOne(ctx, reseller); err != nil {
			return err
		}
	}
	fmt.Printf("  - %d revendeurs importes\n", len(export.Resellers))

	for _, row := range export.Commandes {
		order := models.StoreOrder{
			Date: parseTime(row["Date"]), Produit: s(row, "Produit"), Prix: s(row, "Prix"),
			ClientNom: s(row, "Client_Nom"), ClientEmail: s(row, "Client_Email"),
			ClientTelephone: s(row, "Client_Telephone"), Statut: s(row, "Statut"),
		}
		if _, err := db.Collection(models.StoreOrdersCollection).InsertOne(ctx, order); err != nil {
			return err
		}
	}
	fmt.Printf("  - %d commandes boutique importees\n", len(export.Commandes))

	for _, row := range export.CommandesCustom {
		order := models.CustomCardOrder{
			Date: parseTime(row["Date"]), Materiau: s(row, "Materiau"), Finition: s(row, "Finition"),
			Prix: s(row, "Prix"), Quantite: parseInt(row["Quantite"]), Total: s(row, "Total"),
			NomTitulaire: s(row, "Nom Titulaire"), Entreprise: s(row, "Entreprise"), Poste: s(row, "Poste"),
		}
		if _, err := db.Collection(models.CustomCardOrdersCollection).InsertOne(ctx, order); err != nil {
			return err
		}
	}
	fmt.Printf("  - %d commandes personnalisees importees\n", len(export.CommandesCustom))

	for _, row := range export.Statistiques {
		event := models.ViewEvent{
			ProfileURL: s(row, "ID_Profil"), DateHeure: parseTime(row["Date_Heure"]), Source: s(row, "Source"),
		}
		if _, err := db.Collection(models.ViewEventsCollection).InsertOne(ctx, event); err != nil {
			return err
		}
	}
	fmt.Printf("  - %d vues de profil importees\n", len(export.Statistiques))

	return nil
}

func orDefaultStr(s, def string) string {
	if s == "" {
		return def
	}
	return s
}

func parseTime(v any) time.Time {
	if s, ok := v.(string); ok && s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			return t
		}
	}
	return time.Time{}
}

func parseTimePtr(v any) *time.Time {
	t := parseTime(v)
	if t.IsZero() {
		return nil
	}
	return &t
}

func parseInt(v any) int {
	if f, ok := v.(float64); ok {
		return int(f)
	}
	return 0
}
