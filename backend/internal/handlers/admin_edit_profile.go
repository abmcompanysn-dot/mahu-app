package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"unicode/utf8"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/middleware"
	"mahu-backend/internal/models"
)

// Champs du profil public qu'un admin peut corriger pour un client, avec leur
// longueur maximale. L'adresse du profil (URL_Profil), le mot de passe, le role
// et les modules ne sont volontairement pas modifiables par cette voie.
var adminEditableProfileFields = map[string]int{
	"Nom_Complet":        120,
	"Profession":         160,
	"Compagnie":          160,
	"Location":           200,
	"Telephone":          40,
	"Email_Public":       120,
	"Liens_Sociaux_JSON": 20000,
	"URL_Photo":          500,
	"URL_Couverture":     500,
}

const adminProfileMaxLinks = 30

var (
	linkTypePattern = regexp.MustCompile(`^[a-z0-9_-]{1,24}$`)
	// Les images doivent venir du compte Cloudinary de MAHU (meme origine que
	// l'editeur de profil) : pas d'image hebergee n'importe ou.
	mahuImagePattern = regexp.MustCompile(`^https://res\.cloudinary\.com/dl3cdiz6k/image/upload/[A-Za-z0-9_./,:-]+$`)
)

type adminProfileLink struct {
	Type  string `json:"type"`
	URL   string `json:"url"`
	Label string `json:"label"`
}

// validateAdminLinks verifie la liste des reseaux envoyee par l'admin et la
// renvoie normalisee (JSON propre, sans champ inconnu).
func validateAdminLinks(raw string) (string, error) {
	var links []adminProfileLink
	if err := json.Unmarshal([]byte(raw), &links); err != nil {
		return "", fmt.Errorf("liste de reseaux illisible")
	}
	if len(links) > adminProfileMaxLinks {
		return "", fmt.Errorf("%d reseaux maximum", adminProfileMaxLinks)
	}
	for i := range links {
		l := &links[i]
		l.Type = strings.ToLower(strings.TrimSpace(l.Type))
		l.URL = strings.TrimSpace(l.URL)
		l.Label = strings.TrimSpace(l.Label)
		if !linkTypePattern.MatchString(l.Type) {
			return "", fmt.Errorf("type de reseau invalide : %q", l.Type)
		}
		lower := strings.ToLower(l.URL)
		if !(strings.HasPrefix(lower, "https://") || strings.HasPrefix(lower, "http://") ||
			strings.HasPrefix(lower, "mailto:") || strings.HasPrefix(lower, "tel:")) || unsafeLink(l.URL) || len(l.URL) > 600 {
			return "", fmt.Errorf("lien %d invalide : il doit commencer par https://", i+1)
		}
		if utf8.RuneCountInString(l.Label) > 80 {
			return "", fmt.Errorf("nom du lien %d trop long (80 caracteres maximum)", i+1)
		}
	}
	out, _ := json.Marshal(links)
	return string(out), nil
}

// AdminUpdateUserProfile lets an admin correct a client's public profile
// (name, job, phone, displayed email, social links, photo, cover) without the
// client's password - e.g. a client asking MAHU to fix a link label. Only the
// allow-listed fields above are accepted and validated; the change goes
// through the same save path as the client's own editor (cache refresh
// included) and is written to action_logs with the admin's email.
func (d *Deps) AdminUpdateUserProfile(w http.ResponseWriter, r *http.Request, userIDHex string) {
	userID, err := primitive.ObjectIDFromHex(userIDHex)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "ID invalide")
		return
	}
	admin, ok := middleware.Admin(r)
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Non autorise")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	var body map[string]any
	if err := httpx.DecodeJSON(r, &body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Donnees invalides")
		return
	}

	payload := map[string]any{}
	changed := []string{}
	for key, raw := range body {
		maxLen, allowed := adminEditableProfileFields[key]
		if !allowed {
			httpx.WriteError(w, http.StatusBadRequest, "Champ non modifiable : "+key)
			return
		}
		v, isString := raw.(string)
		if !isString {
			httpx.WriteError(w, http.StatusBadRequest, "Valeur invalide pour "+key)
			return
		}
		v = strings.TrimSpace(v)
		if utf8.RuneCountInString(v) > maxLen {
			httpx.WriteError(w, http.StatusBadRequest, key+" est trop long")
			return
		}
		switch key {
		case "Liens_Sociaux_JSON":
			clean, err := validateAdminLinks(v)
			if err != nil {
				httpx.WriteError(w, http.StatusBadRequest, err.Error())
				return
			}
			v = clean
		case "URL_Photo", "URL_Couverture":
			if v != "" && !mahuImagePattern.MatchString(v) {
				httpx.WriteError(w, http.StatusBadRequest, "L'image doit etre envoyee depuis la console (Cloudinary MAHU)")
				return
			}
		case "Email_Public":
			if v != "" && !publicEmailPattern.MatchString(v) {
				httpx.WriteError(w, http.StatusBadRequest, "Email affiche invalide")
				return
			}
		default:
			if unsafeLink(v) {
				httpx.WriteError(w, http.StatusBadRequest, "Valeur refusee pour "+key)
				return
			}
		}
		payload[key] = v
		changed = append(changed, key)
	}
	if len(payload) == 0 {
		httpx.WriteError(w, http.StatusBadRequest, "Rien a modifier")
		return
	}

	ctx := r.Context()
	var user models.User
	if err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Utilisateur introuvable")
		return
	}

	res, err := d.legacySaveProfile(ctx, payload, &user)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if res["success"] != true {
		msg, _ := res["error"].(string)
		httpx.WriteError(w, http.StatusBadRequest, msg)
		return
	}

	d.logAction(ctx, "adminUpdateUserProfile", models.LogStatusInfo,
		fmt.Sprintf("Admin %s a modifie le profil de %s (/p/%s) : %s", admin.Email, user.Email, user.ProfileURL, strings.Join(changed, ", ")),
		admin.Email)

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true, "changed": changed})
}
