package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"

	"mahu-backend/internal/config"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/services"
)

// Audio (TTS/ASR) support for AI MAHU. TTS uses DashScope's native
// non-realtime speech-synthesis HTTP endpoint directly (same pattern as
// video generation - see ai_video.go), confirmed live: the "-realtime"
// model variants and the OpenAI-compatible /audio/speech route both 404,
// but the plain "qwen3-tts-flash" model against
// /services/aigc/multimodal-generation/generation works and is covered by
// the DashScope workspace's free quota. ASR still goes through LiteLLM to
// OpenAI's whisper-1 (untouched by this).

const dashscopeTTSModel = "qwen3-tts-flash"
const ttsCreditCost = 5
const asrModel = "openai-whisper"
const asrCreditCost = 2

type dashscopeTTSResponse struct {
	Output struct {
		Audio struct {
			URL string `json:"url"`
		} `json:"audio"`
	} `json:"output"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// synthesizeSpeech calls DashScope's non-realtime TTS endpoint and returns
// the raw audio bytes (WAV) - shared by SpeakText below and
// MergeVideoNarration (ai_video.go).
func synthesizeSpeech(env *config.Env, text string) ([]byte, error) {
	reqBody, _ := json.Marshal(map[string]any{
		"model": dashscopeTTSModel,
		"input": map[string]any{
			"text":          text,
			"voice":         "Cherry",
			"language_type": "French",
		},
	})
	req, err := http.NewRequest("POST", env.DashscopeNativeBase()+"/services/aigc/multimodal-generation/generation", bytes.NewReader(reqBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+env.DashscopeAPIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Alibaba Cloud injoignable")
	}
	defer resp.Body.Close()

	var result dashscopeTTSResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("Reponse invalide du provider")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 || result.Output.Audio.URL == "" {
		msg := result.Message
		if msg == "" {
			msg = "Echec de synthese vocale"
		}
		return nil, fmt.Errorf(msg)
	}

	audioResp, err := http.Get(result.Output.Audio.URL)
	if err != nil {
		return nil, fmt.Errorf("Erreur de telechargement audio")
	}
	defer audioResp.Body.Close()
	return io.ReadAll(audioResp.Body)
}

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

	if d.Env.DashscopeAPIKey == "" || d.Env.DashscopeAPIBase == "" {
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

	audioBytes, err := synthesizeSpeech(d.Env, req.Text)
	if err != nil {
		httpx.WriteError(w, http.StatusBadGateway, err.Error())
		return
	}

	if err := services.DeductCredits(ctx, sub, ttsCreditCost); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	audioDataURL := "data:audio/wav;base64," + base64.StdEncoding.EncodeToString(audioBytes)
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
