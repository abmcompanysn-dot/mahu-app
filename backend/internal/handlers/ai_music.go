package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/models"
	"mahu-backend/internal/services"
)

// Music generation (Alibaba Fun-Music) - NEW, UNVERIFIED: same shape as video
// generation in ai_video.go (submit -> task_id -> poll against DashScope's
// native async task API), since Fun-Music has no OpenAI-compatible endpoint
// either. A song takes on the order of minutes to render, same as video, so
// this follows the same submit-then-poll pattern rather than a synchronous
// call that would time out the browser -> Next.js proxy -> Cloudflare tunnel
// chain in front of this backend.

const musicModel = "fun-music-v1"
const musicCreditCost = 100

type submitMusicRequest struct {
	Prompt string `json:"prompt"`
	// Lyrics is optional - when empty, Fun-Music writes its own lyrics from
	// Prompt alone (see the two-mode toggle discussed with the user).
	Lyrics string `json:"lyrics,omitempty"`
}

type dashscopeMusicTaskResponse struct {
	Output struct {
		TaskID     string `json:"task_id"`
		TaskStatus string `json:"task_status"`
		AudioURL   string `json:"audio_url"`
		Message    string `json:"message"`
	} `json:"output"`
	Message string `json:"message"`
}

func (d *Deps) SubmitMusicJob(w http.ResponseWriter, r *http.Request) {
	var req submitMusicRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || len(req.Prompt) == 0 || len(req.Prompt) > 2000 {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	if len(req.Lyrics) > 2000 {
		httpx.WriteError(w, http.StatusBadRequest, "Paroles trop longues (2000 caracteres max)")
		return
	}

	userID, ok := currentUserID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()

	if d.Env.DashscopeAPIKey == "" || d.Env.DashscopeAPIBase == "" {
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

	input := map[string]any{"prompt": req.Prompt}
	if req.Lyrics != "" {
		input["lyrics"] = req.Lyrics
	}

	reqBody, _ := json.Marshal(map[string]any{
		"model":      musicModel,
		"input":      input,
		"parameters": map[string]any{},
	})
	dsReq, _ := http.NewRequest("POST", d.Env.DashscopeNativeBase()+"/services/audio/music/generation", bytes.NewReader(reqBody))
	dsReq.Header.Set("Content-Type", "application/json")
	dsReq.Header.Set("Authorization", "Bearer "+d.Env.DashscopeAPIKey)
	dsReq.Header.Set("X-DashScope-Async", "enable")

	dsResp, err := http.DefaultClient.Do(dsReq)
	if err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "Alibaba Cloud injoignable")
		return
	}
	defer dsResp.Body.Close()

	var task dashscopeMusicTaskResponse
	if err := json.NewDecoder(dsResp.Body).Decode(&task); err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "Reponse invalide du provider")
		return
	}
	if dsResp.StatusCode < 200 || dsResp.StatusCode >= 300 || task.Output.TaskID == "" {
		msg := task.Message
		if msg == "" {
			msg = "Echec de soumission de la tache musicale"
		}
		httpx.WriteError(w, http.StatusBadGateway, msg)
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
		Model:     musicModel,
		Prompt:    req.Prompt,
		Lyrics:    req.Lyrics,
		TaskID:    task.Output.TaskID,
		Status:    models.MusicJobPending,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if _, err := db.Collection(models.MusicJobsCollection).InsertOne(ctx, job); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, map[string]any{
		"jobId":         job.ID.Hex(),
		"status":        job.Status,
		"creditBalance": sub.CreditBalance,
	})
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

	if job.Status == models.MusicJobSucceeded || job.Status == models.MusicJobFailed {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"status":   job.Status,
			"audioUrl": job.AudioURL,
			"error":    job.Error,
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

	var task dashscopeMusicTaskResponse
	if err := json.NewDecoder(dsResp.Body).Decode(&task); err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"status": job.Status})
		return
	}

	update := bson.M{"updatedAt": time.Now()}
	switch task.Output.TaskStatus {
	case "SUCCEEDED":
		update["status"] = models.MusicJobSucceeded
		update["audioUrl"] = task.Output.AudioURL
	case "FAILED":
		update["status"] = models.MusicJobFailed
		update["error"] = task.Output.Message
	case "RUNNING":
		update["status"] = models.MusicJobRunning
	default:
		update["status"] = models.MusicJobPending
	}
	_, _ = db.Collection(models.MusicJobsCollection).UpdateOne(ctx, bson.M{"_id": job.ID}, bson.M{"$set": update})

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"status":   update["status"],
		"audioUrl": task.Output.AudioURL,
		"error":    task.Output.Message,
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
