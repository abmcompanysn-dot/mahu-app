package handlers

import (
	"net/http"

	"mahu-backend/internal/authutil"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/models"
)

// LegacyGet mirrors the previous doGet(e) - only used for the public,
// GET-friendly profile lookup (see lib/api.ts's getPublicProfile, which uses
// callAppScriptGet).
func (d *Deps) LegacyGet(w http.ResponseWriter, r *http.Request) {
	action := r.URL.Query().Get("action")
	if action == "" {
		action = "getProfileData"
	}

	if action == "getProfileData" {
		result, err := d.legacyGetProfileData(r.Context(), r.URL.Query().Get("user"))
		if err != nil {
			httpx.WriteJSON(w, http.StatusOK, map[string]any{"error": err.Error()})
			return
		}
		httpx.WriteJSON(w, http.StatusOK, result)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"status": "API en ligne", "message": "Veuillez utiliser des requetes POST."})
}

// LegacyPost is the single dispatch entry point for every legacy AppScript
// action, mirroring doPost(e)'s switch statement. Requests reach it through
// app/api/appscript/route.ts, which now forwards to this backend instead of
// Google Apps Script - see that file for the (unchanged) frontend contract.
func (d *Deps) LegacyPost(w http.ResponseWriter, r *http.Request) {
	var raw map[string]any
	if err := httpx.DecodeJSON(r, &raw); err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": false, "error": "Invalid payload"})
		return
	}

	action, _ := raw["action"].(string)
	token, _ := raw["token"].(string)
	ctx := r.Context()

	user, _ := d.legacyUser(ctx, token)
	if user == nil {
		// Not a legacy user session - check whether it's an admin panel
		// session instead, so the new admin frontend can drive these same
		// staff actions (card/reseller management) without a separate
		// re-implementation. Synthesized, not persisted: an authenticated
		// AdminUser is already fully trusted (it's what gates /api/admin/*).
		if claims, err := authutil.VerifyAdminToken(d.Env.JWTSecret, token); err == nil {
			user = &models.User{Email: claims.Email, Role: models.RoleAdmin}
		}
	}
	userEmail := "anonyme"
	if user != nil {
		userEmail = user.Email
	}

	// Special case: raw text/plain response, not JSON - mirrors the
	// dedicated branch in doPost for exportLeadsAsCSV.
	if action == "exportLeadsAsCSV" {
		if user == nil {
			httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": false, "error": "Token d'authentification invalide ou manquant pour l'export."})
			return
		}
		csv, err := d.legacyExportLeadsAsCSV(ctx, user)
		if err != nil {
			httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": false, "error": err.Error()})
			return
		}
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(csv))
		return
	}

	result, err := d.runLegacyAction(ctx, action, raw, user)
	if err != nil {
		errMsg := "Erreur dans l'action '" + action + "': " + err.Error()
		d.logAction(ctx, action, models.LogStatusError, errMsg, userEmail)
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": false, "error": "Une erreur interne est survenue. L'incident a ete enregistre."})
		return
	}

	d.logAction(ctx, action, models.LogStatusSuccess, "Action executee avec succes.", userEmail)
	httpx.WriteJSON(w, http.StatusOK, result)
}
