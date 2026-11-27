package handlers

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/middleware"
)

// Export de toute la base (bouton « Exporter toute la base » de /admin) : un ZIP avec
// un CSV par collection (separateur « ; », UTF-8 avec BOM pour Excel). Meme regle que la
// copie nocturne vers le Google Sheet (scripts/sheet-sync/export.js), sauf que les codes
// d'activation des cartes (cardCode, codeCarte, blankCardToken) SONT exportes, a la demande
// du proprietaire (27/11/2026). Les mots de passe, secrets 2FA, jetons et cles ne sortent jamais.
var exportDenyExact = regexp.MustCompile(`^(passwordHash|pinHash|rdpPassword|totpSecret|secret|token|accessToken|pageAccessToken|refreshToken|resetToken|verifyCode|paydunyaToken|paydunyaInvoiceToken)$`)
var exportDenyPart = regexp.MustCompile(`(?i)(secret|passwordhash|apikey|privatekey)`)

func exportDenied(k string) bool { return exportDenyExact.MatchString(k) || exportDenyPart.MatchString(k) }

// exportPlain convertit une valeur BSON en valeur JSON (pour les tableaux et les objets profonds).
func exportPlain(v any) any {
	switch x := v.(type) {
	case bson.D:
		m := make(map[string]any, len(x))
		for _, e := range x {
			if !exportDenied(e.Key) {
				m[e.Key] = exportPlain(e.Value)
			}
		}
		return m
	case bson.M:
		m := make(map[string]any, len(x))
		for k, val := range x {
			if !exportDenied(k) {
				m[k] = exportPlain(val)
			}
		}
		return m
	case bson.A:
		out := make([]any, len(x))
		for i, val := range x {
			out[i] = exportPlain(val)
		}
		return out
	default:
		return exportScalar(v)
	}
}

func exportScalar(v any) any {
	switch x := v.(type) {
	case nil:
		return ""
	case primitive.ObjectID:
		return x.Hex()
	case primitive.DateTime:
		return x.Time().UTC().Format(time.RFC3339)
	case time.Time:
		return x.UTC().Format(time.RFC3339)
	case primitive.Binary:
		return "[binaire]"
	case primitive.Decimal128:
		return x.String()
	case primitive.Timestamp:
		return time.Unix(int64(x.T), 0).UTC().Format(time.RFC3339)
	default:
		return x
	}
}

func exportString(v any) string {
	switch x := v.(type) {
	case string:
		return x
	case bool:
		if x {
			return "true"
		}
		return "false"
	default:
		return fmt.Sprint(x)
	}
}

// exportFlat met un document a plat : sous-objets en colonnes « a.b » (2 niveaux),
// tableaux et objets plus profonds en JSON dans une seule cellule.
func exportFlat(doc bson.D, prefix string, out map[string]string, keys *[]string, depth int) {
	for _, e := range doc {
		if exportDenied(e.Key) {
			continue
		}
		key := e.Key
		if prefix != "" {
			key = prefix + "." + e.Key
		}
		var cell string
		switch v := e.Value.(type) {
		case bson.D:
			if depth < 2 {
				exportFlat(v, key, out, keys, depth+1)
				continue
			}
			b, _ := json.Marshal(exportPlain(v))
			cell = string(b)
		case bson.A:
			b, _ := json.Marshal(exportPlain(v))
			cell = string(b)
		default:
			cell = exportString(exportScalar(v))
		}
		if _, seen := out[key]; !seen {
			*keys = append(*keys, key)
		}
		out[key] = cell
	}
}

func exportCollectionCSV(r *http.Request, name string) ([]byte, int, error) {
	cur, err := db.Collection(name).Find(r.Context(), bson.D{}, options.Find().SetSort(bson.D{{Key: "_id", Value: 1}}))
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(r.Context())

	var rows []map[string]string
	var cols []string
	colSeen := map[string]bool{}
	for cur.Next(r.Context()) {
		var doc bson.D
		if err := cur.Decode(&doc); err != nil {
			return nil, 0, err
		}
		row := map[string]string{}
		var keys []string
		exportFlat(doc, "", row, &keys, 0)
		for _, k := range keys {
			if !colSeen[k] {
				colSeen[k] = true
				cols = append(cols, k)
			}
		}
		rows = append(rows, row)
	}
	if err := cur.Err(); err != nil {
		return nil, 0, err
	}

	var buf bytes.Buffer
	buf.Write([]byte{0xEF, 0xBB, 0xBF}) // BOM UTF-8 (accents corrects dans Excel)
	w := csv.NewWriter(&buf)
	w.Comma = ';'
	w.UseCRLF = true
	_ = w.Write(cols)
	line := make([]string, len(cols))
	for _, row := range rows {
		for i, c := range cols {
			line[i] = row[c]
		}
		_ = w.Write(line)
	}
	w.Flush()
	return buf.Bytes(), len(rows), w.Error()
}

// AdminExportDatabase : GET /api/admin/export → {filename, zipBase64, collections:[{name,rows}]}
func (d *Deps) AdminExportDatabase(w http.ResponseWriter, r *http.Request) {
	names, err := db.DB.ListCollectionNames(r.Context(), bson.D{})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	sort.Strings(names)

	type colInfo struct {
		Name string `json:"name"`
		Rows int    `json:"rows"`
	}
	var infos []colInfo
	var zbuf bytes.Buffer
	zw := zip.NewWriter(&zbuf)
	now := time.Now().UTC()
	for _, n := range names {
		if strings.HasPrefix(n, "system.") {
			continue
		}
		data, count, err := exportCollectionCSV(r, n)
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "Export impossible pour "+n)
			return
		}
		f, err := zw.CreateHeader(&zip.FileHeader{Name: n + ".csv", Method: zip.Deflate, Modified: now})
		if err == nil {
			_, err = f.Write(data)
		}
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
			return
		}
		infos = append(infos, colInfo{Name: n, Rows: count})
	}

	who := ""
	if c, ok := middleware.Admin(r); ok {
		who = c.Email
	}
	var lis strings.Builder
	fmt.Fprintf(&lis, "Export de la base MAHU - %s UTC - demande par %s\r\n\r\n", now.Format("2006-01-02 15:04"), who)
	lis.WriteString("Un fichier CSV par table (separateur ; - s'ouvre dans Excel ou Google Sheets).\r\n")
	lis.WriteString("Inclus : les codes d'activation des cartes.\r\n")
	lis.WriteString("Exclus volontairement : mots de passe (meme chiffres), secrets 2FA, jetons et cles.\r\n")
	lis.WriteString("Ce fichier contient les donnees personnelles des clients : a garder prive.\r\n\r\n")
	for _, c := range infos {
		fmt.Fprintf(&lis, "%-32s %d lignes\r\n", c.Name+".csv", c.Rows)
	}
	if f, err := zw.CreateHeader(&zip.FileHeader{Name: "LISEZMOI.txt", Method: zip.Deflate, Modified: now}); err == nil {
		_, _ = f.Write([]byte(lis.String()))
	}
	if err := zw.Close(); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"filename":    "mahu-base-" + now.Format("2006-01-02-1504") + ".zip",
		"zipBase64":   base64.StdEncoding.EncodeToString(zbuf.Bytes()),
		"collections": infos,
	})
}
