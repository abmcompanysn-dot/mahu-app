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
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/cloudinaryutil"
	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/models"
	"mahu-backend/internal/services"
)

// Music generation - originally targeted Alibaba's Fun-Music (same
// submit/poll DashScope pattern as ai_video.go), but that model turned out
// to be Beijing-region-only and this account's workspace is ap-southeast-1
// ("Model not exist." from DashScope, confirmed live 2026-08-29) - not fixable
// from here. Swapped for Hugging Face's free Inference API running Meta's
// MusicGen (facebook/musicgen-small) instead: instrumental only (no sung
// lyrics - MusicGen doesn't take a lyrics input, unlike Fun-Music), free tier,
// rate-limited (~1000 req/day), with a cold-start delay of up to ~60s.
//
// HF's Inference API is a single synchronous call (no task_id to poll,
// unlike DashScope), but a cold start can take a minute - too slow to hold
// open through the browser -> Next.js proxy -> Cloudflare tunnel chain in
// front of this backend (same 502 risk noted in ai_video.go). So this keeps
// the submit/poll HTTP contract from the original design: SubmitMusicJob
// validates, deducts credits, and returns immediately with a PENDING job;
// the real HF call + Cloudinary re-hosting happens in a goroutine, same
// shape as runNarrationMerge. GetMusicJob just reads the Mongo row - there's
// no external task to poll against.

const huggingFaceMusicModel = "facebook/musicgen-small"
const musicCreditCost = 100

type submitMusicRequest struct {
	Prompt string `json:"prompt"`
	// Lyrics is accepted for UI/API compatibility but not used: MusicGen has
	// no lyrics input, it only generates instrumental audio from a text
	// description. Kept so the frontend's "mes propres paroles" toggle isn't
	// a breaking change - see the note added in app/ai/page.tsx.
	Lyrics string `json:"lyrics,omitempty"`
}

func (d *Deps) SubmitMusicJob(w http.ResponseWriter, r *http.Request) {
	var req submitMusicRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || len(req.Prompt) == 0 || len(req.Prompt) > 2000 {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	userID, ok := currentUserID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()

	if d.Env.HuggingFaceAPIKey == "" {
		httpx.WriteError(w, http.StatusServiceUnavailable, "La generation musicale n'est pas configuree")
		return
	}

	sub, err := services.GetOrCreateSubscription(ctx, userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if sub.CreditBalance < musicCreditCost {
		httpx.WriteError(w, http.StatusPaymentRequired, "Credits insuffisants pour generer une chanson")
		return
	}
	if err := services.DeductCredits(ctx, sub, musicCreditCost); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	now := time.Now()
	job := models.MusicJob{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Model:     huggingFaceMusicModel,
		Prompt:    req.Prompt,
		Lyrics:    req.Lyrics,
		Status:    models.MusicJobRunning,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if _, err := db.Collection(models.MusicJobsCollection).InsertOne(ctx, job); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	go d.runMusicGeneration(job.ID, req.Prompt)

	httpx.WriteJSON(w, http.StatusCreated, map[string]any{
		"jobId":         job.ID.Hex(),
		"status":        job.Status,
		"creditBalance": sub.CreditBalance - musicCreditCost,
	})
}

// runMusicGeneration does the slow, credit-already-deducted part of
// SubmitMusicJob in the background - see that handler's comment for why.
// Retries once on HTTP 503 (HF's "model is loading" cold-start response),
// which carries an estimated_time telling us how long to wait.
func (d *Deps) runMusicGeneration(jobID primitive.ObjectID, prompt string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	fail := func(reason string) {
		_, _ = db.Collection(models.MusicJobsCollection).UpdateOne(ctx, bson.M{"_id": jobID}, bson.M{"$set": bson.M{
			"status":    models.MusicJobFailed,
			"error":     reason,
			"updatedAt": time.Now(),
		}})
	}

	audioBytes, contentType, err := callHuggingFaceMusicGen(d.Env.HuggingFaceAPIKey, prompt)
	if err != nil {
		fail(err.Error())
		return
	}

	// Re-host on Cloudinary for a stable, permanent URL (same pattern as the
	// narration audio in ai_video.go) - HF returns raw bytes, not a URL.
	dataURL := "data:" + contentType + ";base64," + base64.StdEncoding.EncodeToString(audioBytes)
	audioURL, _, err := cloudinaryutil.UploadVideo(d.Env, dataURL)
	if err != nil {
		fail("Erreur hebergement audio: " + err.Error())
		return
	}

	_, _ = db.Collection(models.MusicJobsCollection).UpdateOne(ctx, bson.M{"_id": jobID}, bson.M{"$set": bson.M{
		"status":    models.MusicJobSucceeded,
		"audioUrl":  audioURL,
		"updatedAt": time.Now(),
	}})
}

type hfErrorResponse struct {
	Error         string  `json:"error"`
	EstimatedTime float64 `json:"estimated_time"`
}

// callHuggingFaceMusicGen calls the free HF Inference API for MusicGen.
// On a cold start (503 with estimated_time) it waits and retries once,
// capped at 60s - HF Spaces can legitimately take that long to spin up.
func callHuggingFaceMusicGen(apiKey, prompt string) ([]byte, string, error) {
	url := "https://api-inference.huggingface.co/models/" + huggingFaceMusicModel

	doRequest := func() (*http.Response, error) {
		reqBody, _ := json.Marshal(map[string]any{"inputs": prompt})
		req, err := http.NewRequest("POST", url, bytes.NewReader(reqBody))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+apiKey)
		client := &http.Client{Timeout: 90 * time.Second}
		return client.Do(req)
	}

	resp, err := doRequest()
	if err != nil {
		return nil, "", fmt.Errorf("Hugging Face injoignable")
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusServiceUnavailable {
		var hfErr hfErrorResponse
		body, _ := io.ReadAll(resp.Body)
		_ = json.Unmarshal(body, &hfErr)
		wait := time.Duration(hfErr.EstimatedTime) * time.Second
		if wait <= 0 || wait > 60*time.Second {
			wait = 20 * time.Second
		}
		time.Sleep(wait)

		resp, err = doRequest()
		if err != nil {
			return nil, "", fmt.Errorf("Hugging Face injoignable")
		}
		defer resp.Body.Close()
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		var hfErr hfErrorResponse
		if json.Unmarshal(body, &hfErr) == nil && hfErr.Error != "" {
			return nil, "", fmt.Errorf(hfErr.Error)
		}
		return nil, "", fmt.Errorf("Echec de generation musicale (HTTP %d)", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "audio/flac"
	}
	audioBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("Reponse invalide de Hugging Face")
	}
	return audioBytes, contentType, nil
}

func (d *Deps) GetMusicJob(w http.ResponseWriter, r *http.Request, jobID string) {
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
	var job models.MusicJob
	if err := db.Collection(models.MusicJobsCollection).FindOne(ctx, bson.M{"_id": objID, "userId": userID}).Decode(&job); err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Job not found")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"status":   job.Status,
		"audioUrl": job.AudioURL,
		"error":    job.Error,
	})
}

// ListMusicJobs returns the user's song generation history (most recent
// first), same pattern as ListVideoJobs.
func (d *Deps) ListMusicJobs(w http.ResponseWriter, r *http.Request) {
	userID, ok := currentUserID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()

	cursor, err := db.Collection(models.MusicJobsCollection).Find(
		ctx,
		bson.M{"userId": userID},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(50),
	)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	defer cursor.Close(ctx)

	jobs := []models.MusicJob{}
	if err := cursor.All(ctx, &jobs); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"jobs": jobs})
}
