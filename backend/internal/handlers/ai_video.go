package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

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
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"status": job.Status, "videoUrl": job.VideoURL, "error": job.Error})
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
