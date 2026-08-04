package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"

	"mahu-backend/internal/httpx"
	"mahu-backend/internal/services"
)

// Generic embedding utility - NEW, UNVERIFIED. Deliberately NOT a search/RAG
// feature: no target dataset (profiles, documents, conversations, ...) was
// defined, so this only exposes the raw capability (text -> vector) for any
// authenticated user/future feature to call, rather than guessing what to
// build search over. Wire an actual search feature on top of this once a
// concrete target is chosen.

const embedModel = "text-embedding-v4"
const embedCreditCost = 1

type embedRequest struct {
	Text string `json:"text"`
}

type litellmEmbeddingResponse struct {
	Data []struct {
		Embedding []float64 `json:"embedding"`
	} `json:"data"`
}

func (d *Deps) EmbedText(w http.ResponseWriter, r *http.Request) {
	var req embedRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || len(req.Text) == 0 || len(req.Text) > 8000 {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	userID, ok := currentUserID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()

	if d.Env.LiteLLMMasterKey == "" {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI mode is not configured yet")
		return
	}

	sub, err := services.GetOrCreateSubscription(ctx, userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if sub.CreditBalance < embedCreditCost {
		httpx.WriteError(w, http.StatusPaymentRequired, "Credits insuffisants")
		return
	}

	reqBody, _ := json.Marshal(map[string]any{"model": embedModel, "input": req.Text})
	litellmReq, _ := http.NewRequest("POST", d.Env.LiteLLMURL+"/embeddings", bytes.NewReader(reqBody))
	litellmReq.Header.Set("Content-Type", "application/json")
	litellmReq.Header.Set("Authorization", "Bearer "+d.Env.LiteLLMMasterKey)

	litellmResp, err := http.DefaultClient.Do(litellmReq)
	if err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "LiteLLM injoignable")
		return
	}
	defer litellmResp.Body.Close()

	if litellmResp.StatusCode < 200 || litellmResp.StatusCode >= 300 {
		httpx.WriteError(w, http.StatusBadGateway, "AI provider error")
		return
	}

	var data litellmEmbeddingResponse
	if err := json.NewDecoder(litellmResp.Body).Decode(&data); err != nil || len(data.Data) == 0 {
		httpx.WriteError(w, http.StatusBadGateway, "Aucun vecteur retourne")
		return
	}

	if err := services.DeductCredits(ctx, sub, embedCreditCost); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"embedding":     data.Data[0].Embedding,
		"creditBalance": sub.CreditBalance,
	})
}
