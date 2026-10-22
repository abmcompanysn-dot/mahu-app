package handlers

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"log"
	"net/http"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/kube"
	"mahu-backend/internal/legacyauth"
	"mahu-backend/internal/models"
)

// Cloud PC - "l'ordinateur le plus fin au monde". Scan de la carte -> code
// secret -> le bureau Linux du client s'allume dans mahu-pc et s'affiche dans
// le navigateur via Guacamole (jeton JSON signe, valable quelques minutes).

const (
	cloudPCMaxFailures = 5
	cloudPCLockFor     = 15 * time.Minute
	cloudPCStartWait   = 70 * time.Second
)

var (
	cloudPCCodeRe  = regexp.MustCompile(`^[A-Za-z0-9_-]{4,40}$`)
	cloudPCPinRe   = regexp.MustCompile(`^[0-9]{4,8}$`)
	cloudPCStartMu sync.Mutex // une seule decision d'allumage a la fois (limite de places)
)

func desktopName(pc models.CloudPC) string { return "pc-" + pc.ID.Hex() }

func (d *Deps) kubeClient() (*kube.Client, error) {
	return kube.InCluster()
}

// ensureDesktop creates (idempotently) the desktop's secret, home volume,
// deployment (eteint, replicas 0) and service.
func (d *Deps) ensureDesktop(kc *kube.Client, pc models.CloudPC) error {
	ns, name := d.Env.CloudPCNamespace, desktopName(pc)
	labels := map[string]string{"app": name, "role": "desktop"}
	objs := []struct {
		path string
		obj  any
	}{
		{"/api/v1/namespaces/" + ns + "/secrets", map[string]any{
			"apiVersion": "v1", "kind": "Secret",
			"metadata":   map[string]any{"name": name, "labels": labels},
			"stringData": map[string]string{"RDP_PASSWORD": pc.RDPPassword},
		}},
		{"/api/v1/namespaces/" + ns + "/persistentvolumeclaims", map[string]any{
			"apiVersion": "v1", "kind": "PersistentVolumeClaim",
			"metadata": map[string]any{"name": name + "-home", "labels": labels},
			"spec": map[string]any{
				"accessModes": []string{"ReadWriteOnce"},
				"resources":   map[string]any{"requests": map[string]string{"storage": "5Gi"}},
			},
		}},
		{"/apis/apps/v1/namespaces/" + ns + "/deployments", map[string]any{
			"apiVersion": "apps/v1", "kind": "Deployment",
			"metadata": map[string]any{"name": name, "labels": labels},
			"spec": map[string]any{
				"replicas": 0,
				"strategy": map[string]any{"type": "Recreate"},
				"selector": map[string]any{"matchLabels": map[string]string{"app": name}},
				"template": map[string]any{
					"metadata": map[string]any{"labels": labels},
					"spec": map[string]any{
						"automountServiceAccountToken": false,
						"containers": []any{map[string]any{
							"name":  "desktop",
							"image": d.Env.CloudPCImage,
							"env": []any{
								map[string]string{"name": "PUID", "value": "1000"},
								map[string]string{"name": "PGID", "value": "1000"},
								map[string]string{"name": "TZ", "value": "Africa/Dakar"},
							},
							"envFrom": []any{map[string]any{"secretRef": map[string]string{"name": name}}},
							"ports":   []any{map[string]any{"containerPort": 3389}},
							"readinessProbe": map[string]any{
								"tcpSocket":           map[string]any{"port": 3389},
								"initialDelaySeconds": 5, "periodSeconds": 3,
							},
							"resources": map[string]any{
								"requests": map[string]string{"memory": "384Mi", "cpu": "100m"},
								"limits":   map[string]string{"memory": "2Gi", "cpu": "2"},
							},
							"volumeMounts": []any{
								map[string]any{"name": "home", "mountPath": "/config"},
								map[string]any{"name": "init", "mountPath": "/custom-cont-init.d", "readOnly": true},
								map[string]any{"name": "shm", "mountPath": "/dev/shm"},
							},
						}},
						"volumes": []any{
							map[string]any{"name": "home", "persistentVolumeClaim": map[string]string{"claimName": name + "-home"}},
							map[string]any{"name": "init", "configMap": map[string]any{"name": "desktop-init", "defaultMode": 0o755}},
							map[string]any{"name": "shm", "emptyDir": map[string]any{"medium": "Memory", "sizeLimit": "1Gi"}},
						},
					},
				},
			},
		}},
		{"/api/v1/namespaces/" + ns + "/services", map[string]any{
			"apiVersion": "v1", "kind": "Service",
			"metadata": map[string]any{"name": name, "labels": labels},
			"spec": map[string]any{
				"selector": map[string]string{"app": name},
				"ports":    []any{map[string]any{"port": 3389, "targetPort": 3389}},
			},
		}},
	}
	for _, o := range objs {
		if err := kc.Create(o.path, o.obj); err != nil {
			return err
		}
	}
	return nil
}

func (d *Deps) scaleDesktop(kc *kube.Client, pc models.CloudPC, replicas int) error {
	return kc.Patch("/apis/apps/v1/namespaces/"+d.Env.CloudPCNamespace+"/deployments/"+desktopName(pc)+"/scale",
		map[string]any{"spec": map[string]any{"replicas": replicas}})
}

func (d *Deps) desktopReady(kc *kube.Client, pc models.CloudPC) bool {
	var dep struct {
		Status struct {
			ReadyReplicas int `json:"readyReplicas"`
		} `json:"status"`
	}
	if err := kc.Get("/apis/apps/v1/namespaces/"+d.Env.CloudPCNamespace+"/deployments/"+desktopName(pc), &dep); err != nil {
		return false
	}
	return dep.Status.ReadyReplicas > 0
}

func (d *Deps) deleteDesktop(kc *kube.Client, pc models.CloudPC) error {
	ns, name := d.Env.CloudPCNamespace, desktopName(pc)
	for _, p := range []string{
		"/apis/apps/v1/namespaces/" + ns + "/deployments/" + name,
		"/api/v1/namespaces/" + ns + "/services/" + name,
		"/api/v1/namespaces/" + ns + "/secrets/" + name,
		"/api/v1/namespaces/" + ns + "/persistentvolumeclaims/" + name + "-home",
	} {
		if err := kc.Delete(p); err != nil {
			return err
		}
	}
	return nil
}

// guacamoleURL signs the connection for Guacamole's JSON auth extension
// (HMAC-SHA256 then AES-128-CBC, IV nul), exchanges it for a session token
// and returns the browser URL that opens the desktop directly.
func (d *Deps) guacamoleURL(pc models.CloudPC) (string, error) {
	key, err := hex.DecodeString(d.Env.GuacJSONSecret)
	if err != nil || len(key) != 16 {
		return "", errors.New("GUAC_JSON_SECRET manquante ou invalide")
	}
	payload, _ := json.Marshal(map[string]any{
		"username": "pc-" + pc.CardCode,
		"expires":  time.Now().Add(5 * time.Minute).UnixMilli(),
		"connections": map[string]any{
			"Mon ordinateur Mahu": map[string]any{
				"protocol": "rdp",
				"parameters": map[string]string{
					"hostname":              desktopName(pc) + "." + d.Env.CloudPCNamespace + ".svc.cluster.local",
					"port":                  "3389",
					"username":              "abc",
					"password":              pc.RDPPassword,
					"security":              "any",
					"ignore-cert":           "true",
					"resize-method":         "display-update",
					"server-layout":         "fr-fr-azerty",
					"enable-font-smoothing": "true",
					"color-depth":           "24",
				},
			},
		},
	})
	mac := hmac.New(sha256.New, key)
	mac.Write(payload)
	plain := append(mac.Sum(nil), payload...)
	pad := aes.BlockSize - len(plain)%aes.BlockSize
	plain = append(plain, bytes.Repeat([]byte{byte(pad)}, pad)...)
	block, _ := aes.NewCipher(key)
	enc := make([]byte, len(plain))
	cipher.NewCBCEncrypter(block, make([]byte, aes.BlockSize)).CryptBlocks(enc, plain)

	form := url.Values{"data": {base64.StdEncoding.EncodeToString(enc)}}
	resp, err := http.PostForm(d.Env.GuacInternalURL+"/api/tokens", form)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var tok struct {
		AuthToken string `json:"authToken"`
	}
	if resp.StatusCode != http.StatusOK || json.NewDecoder(resp.Body).Decode(&tok) != nil || tok.AuthToken == "" {
		return "", fmt.Errorf("guacamole a refuse le jeton (HTTP %d)", resp.StatusCode)
	}
	return d.Env.GuacPublicURL + "/?token=" + url.QueryEscape(tok.AuthToken), nil
}

func cloudPCByCode(ctx context.Context, code string) (models.CloudPC, error) {
	var pc models.CloudPC
	err := db.Collection(models.CloudPCsCollection).FindOne(ctx, bson.M{"cardCode": strings.ToUpper(code)}).Decode(&pc)
	return pc, err
}

func firstName(full string) string {
	if f := strings.Fields(full); len(f) > 0 {
		return f[0]
	}
	return ""
}

// ---- public (page /pc/CODE ouverte par le scan) ----

func (d *Deps) GetCloudPCInfo(w http.ResponseWriter, r *http.Request, code string) {
	pc, err := cloudPCByCode(r.Context(), code)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Ordinateur introuvable")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"ownerFirstName": firstName(pc.OwnerName),
		"suspended":      pc.Status != models.CloudPCActive,
		"expired":        time.Now().After(pc.ExpiresAt),
		"locked":         pc.LockedUntil != nil && time.Now().Before(*pc.LockedUntil),
		"running":        pc.Running,
	})
}

func (d *Deps) cloudPCAlert(pc models.CloudPC, subject, text string) {
	if pc.OwnerEmail == "" {
		return
	}
	go func() {
		if err := d.Email.Send(pc.OwnerEmail, subject, text); err != nil {
			log.Printf("[cloudpc] alerte %s: %v", pc.OwnerEmail, err)
		}
	}()
}

func (d *Deps) OpenCloudPCSession(w http.ResponseWriter, r *http.Request, code string) {
	var in struct {
		Pin string `json:"pin"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	ctx := r.Context()
	col := db.Collection(models.CloudPCsCollection)
	pc, err := cloudPCByCode(ctx, code)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Ordinateur introuvable")
		return
	}
	now := time.Now()
	switch {
	case pc.Status != models.CloudPCActive:
		httpx.WriteError(w, http.StatusForbidden, "Cet ordinateur est suspendu. Contacte Mahu.")
		return
	case now.After(pc.ExpiresAt):
		httpx.WriteError(w, http.StatusForbidden, "Ton abonnement a expire. Renouvelle-le pour retrouver ton ordinateur (tes fichiers sont conserves).")
		return
	case pc.LockedUntil != nil && now.Before(*pc.LockedUntil):
		httpx.WriteError(w, http.StatusTooManyRequests, fmt.Sprintf("Trop d'essais. Reessaie apres %s.", pc.LockedUntil.In(dakar()).Format("15h04")))
		return
	}

	if ok, _, _ := legacyauth.VerifyPassword(pc.PinHash, strings.TrimSpace(in.Pin)); !ok {
		fails := pc.FailedAttempts + 1
		set := bson.M{"failedAttempts": fails}
		msg := fmt.Sprintf("Code incorrect. %d essai(s) restant(s).", cloudPCMaxFailures-fails)
		status := http.StatusUnauthorized
		if fails >= cloudPCMaxFailures {
			until := now.Add(cloudPCLockFor)
			set = bson.M{"failedAttempts": 0, "lockedUntil": until}
			msg = "Trop d'essais : ordinateur bloque 15 minutes."
			status = http.StatusTooManyRequests
			d.cloudPCAlert(pc, "Alerte : tentatives sur ton ordinateur Mahu",
				fmt.Sprintf("<p>Bonjour %s,</p><p>%d codes incorrects viennent d'etre tapes sur ta carte <b>%s</b> (%s). L'acces est bloque 15 minutes.</p><p>Si ce n'est pas toi, ta carte a peut-etre ete perdue : contacte Mahu pour la bloquer.</p>",
					html.EscapeString(firstName(pc.OwnerName)), cloudPCMaxFailures, html.EscapeString(pc.CardCode), now.In(dakar()).Format("02/01/2006 15h04")))
		}
		_, _ = col.UpdateOne(ctx, bson.M{"_id": pc.ID}, bson.M{"$set": set})
		httpx.WriteError(w, status, msg)
		return
	}

	kc, err := d.kubeClient()
	if err != nil {
		log.Printf("[cloudpc] kube: %v", err)
		httpx.WriteError(w, http.StatusServiceUnavailable, "Service momentanement indisponible")
		return
	}

	if !pc.Running {
		cloudPCStartMu.Lock()
		running, _ := col.CountDocuments(ctx, bson.M{"running": true})
		if int(running) >= d.Env.CloudPCMaxRunning {
			cloudPCStartMu.Unlock()
			httpx.WriteError(w, http.StatusServiceUnavailable, "Tous les ordinateurs sont occupes pour le moment. Reessaie dans quelques minutes.")
			return
		}
		if err := d.ensureDesktop(kc, pc); err == nil {
			err = d.scaleDesktop(kc, pc, 1)
		}
		if err != nil {
			cloudPCStartMu.Unlock()
			log.Printf("[cloudpc] demarrage %s: %v", pc.CardCode, err)
			httpx.WriteError(w, http.StatusInternalServerError, "Impossible d'allumer l'ordinateur")
			return
		}
		_, _ = col.UpdateOne(ctx, bson.M{"_id": pc.ID}, bson.M{"$set": bson.M{"running": true, "startedAt": now}})
		cloudPCStartMu.Unlock()
	}

	deadline := time.Now().Add(cloudPCStartWait)
	for !d.desktopReady(kc, pc) {
		if time.Now().After(deadline) {
			httpx.WriteError(w, http.StatusGatewayTimeout, "L'ordinateur met du temps a demarrer. Reessaie dans une minute.")
			return
		}
		time.Sleep(2 * time.Second)
	}
	time.Sleep(3 * time.Second) // xrdp accepte les connexions un peu apres l'ouverture du port

	link, err := d.guacamoleURL(pc)
	if err != nil {
		log.Printf("[cloudpc] guacamole %s: %v", pc.CardCode, err)
		httpx.WriteError(w, http.StatusInternalServerError, "Impossible d'ouvrir l'ecran")
		return
	}
	_, _ = col.UpdateOne(ctx, bson.M{"_id": pc.ID}, bson.M{"$set": bson.M{"failedAttempts": 0, "lastLoginAt": now}, "$unset": bson.M{"lockedUntil": ""}})
	ip := r.Header.Get("CF-Connecting-IP")
	if ip == "" {
		ip = r.RemoteAddr
	}
	d.cloudPCAlert(pc, "Connexion a ton ordinateur Mahu",
		fmt.Sprintf("<p>Bonjour %s,</p><p>Ton ordinateur Mahu vient d'etre ouvert avec ta carte le %s (adresse %s).</p><p>Si ce n'est pas toi, change ton code et contacte Mahu.</p>",
			html.EscapeString(firstName(pc.OwnerName)), now.In(dakar()).Format("02/01/2006 a 15h04"), html.EscapeString(ip)))
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"url": link})
}

func dakar() *time.Location {
	if loc, err := time.LoadLocation("Africa/Dakar"); err == nil {
		return loc
	}
	return time.UTC
}

// RunCloudPCReaper eteint les ordinateurs allumes depuis plus de
// CLOUDPC_SESSION_HOURS (libere la place ; les fichiers restent sur le disque).
func (d *Deps) RunCloudPCReaper(ctx context.Context) {
	t := time.NewTicker(5 * time.Minute)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
		limit := time.Now().Add(-time.Duration(d.Env.CloudPCSessionHour) * time.Hour)
		cur, err := db.Collection(models.CloudPCsCollection).Find(ctx, bson.M{"running": true, "startedAt": bson.M{"$lt": limit}})
		if err != nil {
			continue
		}
		var pcs []models.CloudPC
		_ = cur.All(ctx, &pcs)
		if len(pcs) == 0 {
			continue
		}
		kc, err := d.kubeClient()
		if err != nil {
			continue
		}
		for _, pc := range pcs {
			if err := d.scaleDesktop(kc, pc, 0); err == nil {
				_, _ = db.Collection(models.CloudPCsCollection).UpdateOne(ctx, bson.M{"_id": pc.ID}, bson.M{"$set": bson.M{"running": false}})
				log.Printf("[cloudpc] %s eteint (session de plus de %dh)", pc.CardCode, d.Env.CloudPCSessionHour)
			}
		}
	}
}

// ---- admin ----

func (d *Deps) AdminListCloudPCs(w http.ResponseWriter, r *http.Request) {
	cur, err := db.Collection(models.CloudPCsCollection).Find(r.Context(), bson.M{}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	pcs := []models.CloudPC{}
	_ = cur.All(r.Context(), &pcs)
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"pcs": pcs, "maxRunning": d.Env.CloudPCMaxRunning})
}

func (d *Deps) AdminCreateCloudPC(w http.ResponseWriter, r *http.Request) {
	var in struct {
		CardCode   string `json:"cardCode"`
		OwnerName  string `json:"ownerName"`
		OwnerEmail string `json:"ownerEmail"`
		Pin        string `json:"pin"`
		Months     int    `json:"months"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	in.CardCode = strings.ToUpper(strings.TrimSpace(in.CardCode))
	in.OwnerEmail = strings.ToLower(strings.TrimSpace(in.OwnerEmail))
	if !cloudPCCodeRe.MatchString(in.CardCode) {
		httpx.WriteError(w, http.StatusBadRequest, "Code carte invalide (4 a 40 lettres, chiffres, - ou _)")
		return
	}
	if !cloudPCPinRe.MatchString(in.Pin) {
		httpx.WriteError(w, http.StatusBadRequest, "Le code secret doit faire 4 a 8 chiffres")
		return
	}
	if _, err := mail.ParseAddress(in.OwnerEmail); err != nil || strings.TrimSpace(in.OwnerName) == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Nom et email du client requis")
		return
	}
	if in.Months < 1 || in.Months > 36 {
		in.Months = 12
	}
	if _, err := cloudPCByCode(r.Context(), in.CardCode); err == nil {
		httpx.WriteError(w, http.StatusConflict, "Cette carte a deja un ordinateur")
		return
	}
	pinHash, err := legacyauth.HashPassword(in.Pin)
	rdpPassword, rerr := randomHex(16)
	if err != nil || rerr != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	now := time.Now()
	pc := models.CloudPC{
		ID: primitive.NewObjectID(), CardCode: in.CardCode, OwnerName: clip(in.OwnerName, 120), OwnerEmail: in.OwnerEmail,
		OS: "linux", PinHash: pinHash, RDPPassword: rdpPassword, Status: models.CloudPCActive,
		ExpiresAt: now.AddDate(0, in.Months, 0), CreatedAt: now,
	}
	kc, err := d.kubeClient()
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "Cluster indisponible : "+err.Error())
		return
	}
	if err := d.ensureDesktop(kc, pc); err != nil {
		log.Printf("[cloudpc] creation %s: %v", pc.CardCode, err)
		httpx.WriteError(w, http.StatusInternalServerError, "Creation du bureau impossible")
		return
	}
	if _, err := db.Collection(models.CloudPCsCollection).InsertOne(r.Context(), pc); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, map[string]any{"pc": pc})
}

func (d *Deps) adminCloudPC(w http.ResponseWriter, r *http.Request, id string) (models.CloudPC, bool) {
	var pc models.CloudPC
	objID, err := primitive.ObjectIDFromHex(id)
	if err == nil {
		err = db.Collection(models.CloudPCsCollection).FindOne(r.Context(), bson.M{"_id": objID}).Decode(&pc)
	}
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Ordinateur introuvable")
		return pc, false
	}
	return pc, true
}

// AdminUpdateCloudPC : nouveau code secret, suspension/reactivation, prolongation.
func (d *Deps) AdminUpdateCloudPC(w http.ResponseWriter, r *http.Request, id string) {
	pc, ok := d.adminCloudPC(w, r, id)
	if !ok {
		return
	}
	var in struct {
		Pin          string `json:"pin"`
		Status       string `json:"status"`
		ExtendMonths int    `json:"extendMonths"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	set := bson.M{}
	if in.Pin != "" {
		if !cloudPCPinRe.MatchString(in.Pin) {
			httpx.WriteError(w, http.StatusBadRequest, "Le code secret doit faire 4 a 8 chiffres")
			return
		}
		h, _ := legacyauth.HashPassword(in.Pin)
		set["pinHash"], set["failedAttempts"] = h, 0
	}
	if in.Status == models.CloudPCActive || in.Status == models.CloudPCSuspended {
		set["status"] = in.Status
	}
	if in.ExtendMonths > 0 && in.ExtendMonths <= 36 {
		from := pc.ExpiresAt
		if time.Now().After(from) {
			from = time.Now()
		}
		set["expiresAt"] = from.AddDate(0, in.ExtendMonths, 0)
	}
	if len(set) == 0 {
		httpx.WriteError(w, http.StatusBadRequest, "Rien a modifier")
		return
	}
	update := bson.M{"$set": set}
	if in.Pin != "" {
		update["$unset"] = bson.M{"lockedUntil": ""}
	}
	if _, err := db.Collection(models.CloudPCsCollection).UpdateOne(r.Context(), bson.M{"_id": pc.ID}, update); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if in.Status == models.CloudPCSuspended && pc.Running {
		if kc, err := d.kubeClient(); err == nil && d.scaleDesktop(kc, pc, 0) == nil {
			_, _ = db.Collection(models.CloudPCsCollection).UpdateOne(r.Context(), bson.M{"_id": pc.ID}, bson.M{"$set": bson.M{"running": false}})
		}
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (d *Deps) AdminStopCloudPC(w http.ResponseWriter, r *http.Request, id string) {
	pc, ok := d.adminCloudPC(w, r, id)
	if !ok {
		return
	}
	kc, err := d.kubeClient()
	if err == nil {
		err = d.scaleDesktop(kc, pc, 0)
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Arret impossible")
		return
	}
	_, _ = db.Collection(models.CloudPCsCollection).UpdateOne(r.Context(), bson.M{"_id": pc.ID}, bson.M{"$set": bson.M{"running": false}})
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

// AdminDeleteCloudPC supprime l'ordinateur ET ses fichiers (irreversible).
func (d *Deps) AdminDeleteCloudPC(w http.ResponseWriter, r *http.Request, id string) {
	pc, ok := d.adminCloudPC(w, r, id)
	if !ok {
		return
	}
	kc, err := d.kubeClient()
	if err == nil {
		err = d.deleteDesktop(kc, pc)
	}
	if err != nil {
		log.Printf("[cloudpc] suppression %s: %v", pc.CardCode, err)
		httpx.WriteError(w, http.StatusInternalServerError, "Suppression impossible")
		return
	}
	_, _ = db.Collection(models.CloudPCsCollection).DeleteOne(r.Context(), bson.M{"_id": pc.ID})
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}
