package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"

	"mahu-backend/internal/httpx"
	"mahu-backend/internal/services"
)

// Audio (TTS/ASR) support for AI MAHU. Alibaba's DashScope TTS/ASR models
// (qwen3-tts-flash-realtime, fun-asr-*) are WebSocket-only - they 404 against
// DashScope's OpenAI-compatible REST host no matter how LiteLLM is
// configured for them (confirmed live). Using OpenAI's tts-1/whisper-1
// instead, which genuinely implement the OpenAI /audio/speech and
// /audio/transcriptions REST contract LiteLLM expects.

const ttsModel = "openai-tts"
const ttsCreditCost = 5
const asrModel = "openai-whisper"
const asrCreditCost = 2

type speakRequest struct {
	Text string `json:"text"`
}

// SpeakText converts text to speech (text-to-speech), for reading an AI
// response aloud. Not tied to a conversation - purely a utility call.
func (d *Deps) SpeakText(w http.ResponseWriter, r *http.Request) {
	var req speakRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || len(req.Text) == 0 || len(req.Text) > 4000 {
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
	if sub.CreditBalance < ttsCreditCost {
		httpx.WriteError(w, http.StatusPaymentRequired, "Credits insuffisants pour la synthese vocale")
		return
	}

	reqBody, _ := json.Marshal(map[string]any{"model": ttsModel, "input": req.Text, "voice": "alloy"})
	litellmReq, _ := http.NewRequest("POST", d.Env.LiteLLMURL+"/audio/speech", bytes.NewReader(reqBody))
	litellmReq.Header.Set("Content-Type", "application/json")
	litellmReq.Header.Set("Authorization", "Bearer "+d.Env.LiteLLMMasterKey)

	litellmResp, err := http.DefaultClient.Do(litellmReq)
	if err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "LiteLLM injoignable")
		return
	}
	defer litellmResp.Body.Close()

	audioBytes, err := io.ReadAll(litellmResp.Body)
	if err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "AI provider error")
		return
	}
	if litellmResp.StatusCode < 200 || litellmResp.StatusCode >= 300 {
		httpx.WriteError(w, http.StatusBadGateway, "AI provider error: "+string(audioBytes[:min(len(audioBytes), 300)]))
		return
	}

	if err := services.DeductCredits(ctx, sub, ttsCreditCost); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	audioDataURL := "data:audio/mpeg;base64," + base64.StdEncoding.EncodeToString(audioBytes)
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"audioDataUrl":  audioDataURL,
		"creditBalance": sub.CreditBalance,
	})
}

// TranscribeAudio converts a recorded voice message to text (speech-to-text).
// Separate from the browser-native Web Speech API dictation already used for
// live typing - this goes through Qwen's ASR model instead, for browsers
// without Web Speech support or when a different transcription quality/
// language is needed.
func (d *Deps) TranscribeAudio(w http.ResponseWriter, r *http.Request) {
	userID, ok := currentUserID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	file, header, err := r.FormFile("audio")
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Fichier audio manquant")
		return
	}
	defer file.Close()

	if d.Env.LiteLLMMasterKey == "" {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI mode is not configured yet")
		return
	}

	sub, err := services.GetOrCreateSubscription(ctx, userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if sub.CreditBalance < asrCreditCost {
		httpx.WriteError(w, http.StatusPaymentRequired, "Credits insuffisants pour la transcription")
		return
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", header.Filename)
	if err == nil {
		_, err = io.Copy(part, file)
	}
	if err == nil {
		err = writer.WriteField("model", asrModel)
	}
	if err == nil {
		err = writer.Close()
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	litellmReq, _ := http.NewRequest("POST", d.Env.LiteLLMURL+"/audio/transcriptions", &body)
	litellmReq.Header.Set("Content-Type", writer.FormDataContentType())
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

	var data struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(litellmResp.Body).Decode(&data); err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "Reponse invalide du provider")
		return
	}

	if err := services.DeductCredits(ctx, sub, asrCreditCost); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"text":          data.Text,
		"creditBalance": sub.CreditBalance,
	})
}
