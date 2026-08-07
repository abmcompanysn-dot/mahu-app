package handlers

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"mahu-backend/internal/cloudinaryutil"
	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/models"
	"mahu-backend/internal/services"
)

// Video generation (Alibaba wan2.x) - NEW, UNVERIFIED: unlike chat/vision,
// video generation has no OpenAI-equivalent endpoint, so LiteLLM's
// OpenAI-compatible proxy can't route it. This calls Alibaba's native
// DashScope async task API directly (submit -> task_id -> poll), which is
// documented and stable across their video/image-synthesis endpoints, but
// has not been exercised against the live key (no way to test locally).
// Only wan2.6-t2v (text-to-video) is wired to the UI for now - the other
// wan2.x variants (image-to-video, video-edit) would need their own input
// shape (a source image/video) and are declared in litellm/config.yaml but
// not implemented as app features yet.

const videoModel = "wan2.6-t2v"
const videoCreditCost = 100
const narrationCreditCost = 5

type submitVideoRequest struct {
	Prompt string `json:"prompt"`
}

type dashscopeTaskResponse struct {
	Output struct {
		TaskID     string `json:"task_id"`
		TaskStatus string `json:"task_status"`
		VideoURL   string `json:"video_url"`
		Message    string `json:"message"`
	} `json:"output"`
	Message string `json:"message"`
}

func (d *Deps) SubmitVideoJob(w http.ResponseWriter, r *http.Request) {
	var req submitVideoRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || len(req.Prompt) == 0 || len(req.Prompt) > 2000 {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	userID, ok := currentUserID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()

	if d.Env.DashscopeAPIKey == "" || d.Env.DashscopeAPIBase == "" {
		httpx.WriteError(w, http.StatusServiceUnavailable, "La generation video n'est pas configuree")
		return
	}

	sub, err := services.GetOrCreateSubscription(ctx, userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if sub.CreditBalance < videoCreditCost {
		httpx.WriteError(w, http.StatusPaymentRequired, "Credits insuffisants pour generer une video")
		return
	}

	reqBody, _ := json.Marshal(map[string]any{
		"model":      videoModel,
		"input":      map[string]any{"prompt": req.Prompt},
		"parameters": map[string]any{},
	})
	dsReq, _ := http.NewRequest("POST", d.Env.DashscopeNativeBase()+"/services/aigc/video-generation/video-synthesis", bytes.NewReader(reqBody))
	dsReq.Header.Set("Content-Type", "application/json")
	dsReq.Header.Set("Authorization", "Bearer "+d.Env.DashscopeAPIKey)
	dsReq.Header.Set("X-DashScope-Async", "enable")

	dsResp, err := http.DefaultClient.Do(dsReq)
	if err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "Alibaba Cloud injoignable")
		return
	}
	defer dsResp.Body.Close()

	var task dashscopeTaskResponse
	if err := json.NewDecoder(dsResp.Body).Decode(&task); err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "Reponse invalide du provider")
		return
	}
	if dsResp.StatusCode < 200 || dsResp.StatusCode >= 300 || task.Output.TaskID == "" {
		msg := task.Message
		if msg == "" {
			msg = "Echec de soumission de la tache video"
		}
		httpx.WriteError(w, http.StatusBadGateway, msg)
		return
	}

	if err := services.DeductCredits(ctx, sub, videoCreditCost); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	now := time.Now()
	job := models.VideoJob{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Model:     videoModel,
		Prompt:    req.Prompt,
		TaskID:    task.Output.TaskID,
		Status:    models.VideoJobPending,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if _, err := db.Collection(models.VideoJobsCollection).InsertOne(ctx, job); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, map[string]any{
		"jobId":         job.ID.Hex(),
		"status":        job.Status,
		"creditBalance": sub.CreditBalance,
	})
}

func (d *Deps) GetVideoJob(w http.ResponseWriter, r *http.Request, jobID string) {
	userID, ok := currentUserID(w, r)
	if !ok {
		return
	}
	objID, err := primitive.ObjectIDFromHex(jobID)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Job not found")
		return
	}

	ctx := r.Context()
	var job models.VideoJob
	if err := db.Collection(models.VideoJobsCollection).FindOne(ctx, bson.M{"_id": objID, "userId": userID}).Decode(&job); err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Job not found")
		return
	}

	if job.Status == models.VideoJobSucceeded || job.Status == models.VideoJobFailed {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"status":           job.Status,
			"videoUrl":         job.VideoURL,
			"error":            job.Error,
			"narrationStatus":  job.NarrationStatus,
			"narratedVideoUrl": job.NarratedVideoURL,
			"narrationError":   job.NarrationError,
		})
		return
	}

	dsReq, _ := http.NewRequest("GET", d.Env.DashscopeNativeBase()+"/tasks/"+job.TaskID, nil)
	dsReq.Header.Set("Authorization", "Bearer "+d.Env.DashscopeAPIKey)

	dsResp, err := http.DefaultClient.Do(dsReq)
	if err != nil {
		// Transient network error - report the last known status rather than failing the job.
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"status": job.Status})
		return
	}
	defer dsResp.Body.Close()

	var task dashscopeTaskResponse
	if err := json.NewDecoder(dsResp.Body).Decode(&task); err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"status": job.Status})
		return
	}

	update := bson.M{"updatedAt": time.Now()}
	switch task.Output.TaskStatus {
	case "SUCCEEDED":
		update["status"] = models.VideoJobSucceeded
		update["videoUrl"] = task.Output.VideoURL
	case "FAILED":
		update["status"] = models.VideoJobFailed
		update["error"] = task.Output.Message
	case "RUNNING":
		update["status"] = models.VideoJobRunning
	default:
		update["status"] = models.VideoJobPending
	}
	_, _ = db.Collection(models.VideoJobsCollection).UpdateOne(ctx, bson.M{"_id": job.ID}, bson.M{"$set": update})

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"status":   update["status"],
		"videoUrl": task.Output.VideoURL,
		"error":    task.Output.Message,
	})
}

type mergeNarrationRequest struct {
	Text string `json:"text"`
}

// MergeVideoNarration kicks off a voice-over merge in the background and
// returns immediately - NEW, UNVERIFIED end-to-end. The actual work (TTS,
// re-hosting the video + narration on Cloudinary, then compositing via an
// audio-overlay transformation) reliably takes well over a minute, which was
// timing out synchronously through the browser -> Next.js proxy -> Cloudflare
// tunnel chain in front of this backend (observed as 502s). It now follows
// the same submit-then-poll shape as SubmitVideoJob/GetVideoJob: this handler
// only validates, deducts credits, and flips narrationStatus to PENDING; the
// goroutine below does the slow part and writes the result whenever it's
// done, decoupled from any single HTTP request's lifetime.
func (d *Deps) MergeVideoNarration(w http.ResponseWriter, r *http.Request, jobID string) {
	userID, ok := currentUserID(w, r)
	if !ok {
		return
	}
	objID, err := primitive.ObjectIDFromHex(jobID)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Job not found")
		return
	}

	var req mergeNarrationRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || len(req.Text) == 0 || len(req.Text) > 4000 {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	ctx := r.Context()
	var job models.VideoJob
	if err := db.Collection(models.VideoJobsCollection).FindOne(ctx, bson.M{"_id": objID, "userId": userID}).Decode(&job); err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Job not found")
		return
	}
	if job.Status != models.VideoJobSucceeded || job.VideoURL == "" {
		httpx.WriteError(w, http.StatusBadRequest, "La video n'est pas encore prete")
		return
	}

	if d.Env.LiteLLMMasterKey == "" {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI mode is not configured yet")
		return
	}

	sub, err := services.GetOrCreateSubscription(ctx, userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if sub.CreditBalance < narrationCreditCost {
		httpx.WriteError(w, http.StatusPaymentRequired, "Credits insuffisants pour la voix off")
		return
	}
	if err := services.DeductCredits(ctx, sub, narrationCreditCost); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	_, _ = db.Collection(models.VideoJobsCollection).UpdateOne(ctx, bson.M{"_id": job.ID}, bson.M{"$set": bson.M{
		"narrationStatus": models.VideoJobPending,
		"narrationError":  "",
		"updatedAt":       time.Now(),
	}})

	go d.runNarrationMerge(job.ID, job.VideoURL, req.Text)

	httpx.WriteJSON(w, http.StatusAccepted, map[string]any{
		"narrationStatus": models.VideoJobPending,
		"creditBalance":   sub.CreditBalance - narrationCreditCost,
	})
}

// runNarrationMerge does the slow, credit-already-deducted part of
// MergeVideoNarration in the background - see the handler's comment above
// for why this isn't inline in the HTTP request anymore. Uses a fresh
// context (background, with its own timeout) since the original request's
// context is cancelled the moment the handler above returns.
func (d *Deps) runNarrationMerge(jobID primitive.ObjectID, videoURL, text string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	fail := func(reason string) {
		_, _ = db.Collection(models.VideoJobsCollection).UpdateOne(ctx, bson.M{"_id": jobID}, bson.M{"$set": bson.M{
			"narrationStatus": models.VideoJobFailed,
			"narrationError":  reason,
			"updatedAt":       time.Now(),
		}})
	}

	// 1. Text-to-speech (same provider/model as SpeakText).
	ttsBody, _ := json.Marshal(map[string]any{"model": ttsModel, "input": text, "voice": "Cherry"})
	ttsReq, _ := http.NewRequestWithContext(ctx, "POST", d.Env.LiteLLMURL+"/audio/speech", bytes.NewReader(ttsBody))
	ttsReq.Header.Set("Content-Type", "application/json")
	ttsReq.Header.Set("Authorization", "Bearer "+d.Env.LiteLLMMasterKey)
	ttsResp, err := http.DefaultClient.Do(ttsReq)
	if err != nil {
		fail("LiteLLM injoignable")
		return
	}
	defer ttsResp.Body.Close()
	audioBytes, err := io.ReadAll(ttsResp.Body)
	if err != nil {
		fail("AI provider error")
		return
	}
	if ttsResp.StatusCode < 200 || ttsResp.StatusCode >= 300 {
		fail("AI provider error: " + string(audioBytes[:min(len(audioBytes), 300)]))
		return
	}

	// 2. Re-host the video and the generated narration on Cloudinary, since
	// the audio-overlay transformation addresses assets by Cloudinary
	// public_id (the DashScope video_url is a short-lived signed OSS link).
	_, videoPublicID, err := cloudinaryutil.UploadVideo(d.Env, videoURL)
	if err != nil {
		fail("Erreur hebergement video: " + err.Error())
		return
	}
	audioDataURL := "data:audio/mpeg;base64," + base64.StdEncoding.EncodeToString(audioBytes)
	_, audioPublicID, err := cloudinaryutil.UploadVideo(d.Env, audioDataURL)
	if err != nil {
		fail("Erreur hebergement audio: " + err.Error())
		return
	}

	// 3. l_audio overlay layers the narration on top of the video's own
	// audio track (Cloudinary public_id path separators must be escaped as
	// ":" inside a transformation component).
	escapedAudioID := bytes.ReplaceAll([]byte(audioPublicID), []byte("/"), []byte(":"))
	mergedURL := fmt.Sprintf(
		"https://res.cloudinary.com/%s/video/upload/l_audio:%s,fl_layer_apply/%s.mp4",
		d.Env.CloudinaryCloudName, string(escapedAudioID), videoPublicID,
	)

	_, _ = db.Collection(models.VideoJobsCollection).UpdateOne(ctx, bson.M{"_id": jobID}, bson.M{"$set": bson.M{
		"narrationStatus":  models.VideoJobSucceeded,
		"narratedVideoUrl": mergedURL,
		"updatedAt":        time.Now(),
	}})
}
