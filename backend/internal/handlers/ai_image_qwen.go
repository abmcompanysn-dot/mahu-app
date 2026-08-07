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

// Image generation on Alibaba's wan2.6-image, submit+poll like ai_video.go -
// VERIFIED against the live key (unlike the rest of this file's siblings):
// endpoint is /services/aigc/image-generation/generation (NOT .../text2image/
// image-synthesis, which 403s for this model), the payload is chat-style
// (input.messages, not input.prompt), and parameters.enable_interleave must
// be true or DashScope rejects text-only prompts requiring 1-4 source
// images. A real run took ~2m30s, so this must stay async - Cloudflare
// Tunnel's ~100s edge timeout would kill a synchronous call outright.
const qwenImageModel = "wan2.6-image"

type submitImageJobRequest struct {
	Prompt string `json:"prompt"`
}

type dashscopeImageGenResponse struct {
	Output struct {
		TaskID     string `json:"task_id"`
		TaskStatus string `json:"task_status"`
		Message    string `json:"message"`
		Choices    []struct {
			Message struct {
				Content []struct {
					Type  string `json:"type"`
					Image string `json:"image"`
				} `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	} `json:"output"`
	Message string `json:"message"`
}

func (d *Deps) SubmitImageJob(w http.ResponseWriter, r *http.Request, conversationID string) {
	var req submitImageJobRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || len(req.Prompt) == 0 || len(req.Prompt) > 2000 {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	userID, ok := currentUserID(w, r)
	if !ok {
		return
	}
	convObjID, err := primitive.ObjectIDFromHex(conversationID)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Conversation not found")
		return
	}

	ctx := r.Context()
	var conversation models.Conversation
	if err := db.Collection(models.ConversationsCollection).FindOne(ctx, bson.M{"_id": convObjID, "userId": userID}).Decode(&conversation); err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Conversation not found")
		return
	}

	if d.Env.DashscopeAPIKey == "" || d.Env.DashscopeAPIBase == "" {
		httpx.WriteError(w, http.StatusServiceUnavailable, "La generation d'image n'est pas configuree")
		return
	}

	sub, err := services.GetOrCreateSubscription(ctx, userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if sub.CreditBalance < imageGenCreditCost {
		httpx.WriteError(w, http.StatusPaymentRequired, "Credits insuffisants pour generer une image")
		return
	}

	now := time.Now()
	userMessage := models.Message{
		ID:             primitive.NewObjectID(),
		ConversationID: conversation.ID,
		Role:           "user",
		Content:        req.Prompt,
		ModelName:      qwenImageModel,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if _, err := db.Collection(models.MessagesCollection).InsertOne(ctx, userMessage); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	reqBody, _ := json.Marshal(map[string]any{
		"model": qwenImageModel,
		"input": map[string]any{
			"messages": []map[string]any{
				{"role": "user", "content": []map[string]any{{"text": req.Prompt}}},
			},
		},
		"parameters": map[string]any{"enable_interleave": true},
	})
	dsReq, _ := http.NewRequest("POST", d.Env.DashscopeNativeBase()+"/services/aigc/image-generation/generation", bytes.NewReader(reqBody))
	dsReq.Header.Set("Content-Type", "application/json")
	dsReq.Header.Set("Authorization", "Bearer "+d.Env.DashscopeAPIKey)
	dsReq.Header.Set("X-DashScope-Async", "enable")

	dsResp, err := http.DefaultClient.Do(dsReq)
	if err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "Alibaba Cloud injoignable")
		return
	}
	defer dsResp.Body.Close()

	var task dashscopeImageGenResponse
	if err := json.NewDecoder(dsResp.Body).Decode(&task); err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "Reponse invalide du provider")
		return
	}
	if dsResp.StatusCode < 200 || dsResp.StatusCode >= 300 || task.Output.TaskID == "" {
		msg := task.Output.Message
		if msg == "" {
			msg = task.Message
		}
		if msg == "" {
			msg = "Echec de soumission de la generation d'image"
		}
		httpx.WriteError(w, http.StatusBadGateway, msg)
		return
	}

	job := models.ImageJob{
		ID:             primitive.NewObjectID(),
		UserID:         userID,
		ConversationID: conversation.ID,
		Prompt:         req.Prompt,
		TaskID:         task.Output.TaskID,
		Status:         models.ImageJobPending,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if _, err := db.Collection(models.ImageJobsCollection).InsertOne(ctx, job); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, map[string]any{
		"jobId":       job.ID.Hex(),
		"userMessage": userMessage,
		"status":      job.Status,
	})
}

func (d *Deps) GetImageJob(w http.ResponseWriter, r *http.Request, jobID string) {
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
	var job models.ImageJob
	if err := db.Collection(models.ImageJobsCollection).FindOne(ctx, bson.M{"_id": objID, "userId": userID}).Decode(&job); err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Job not found")
		return
	}

	if job.Status == models.ImageJobSucceeded || job.Status == models.ImageJobFailed {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"status": job.Status, "imageDataUrl": job.ImageDataURL, "error": job.Error})
		return
	}

	dsReq, _ := http.NewRequest("GET", d.Env.DashscopeNativeBase()+"/tasks/"+job.TaskID, nil)
	dsReq.Header.Set("Authorization", "Bearer "+d.Env.DashscopeAPIKey)

	dsResp, err := http.DefaultClient.Do(dsReq)
	if err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"status": job.Status})
		return
	}
	defer dsResp.Body.Close()

	var task dashscopeImageGenResponse
	if err := json.NewDecoder(dsResp.Body).Decode(&task); err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"status": job.Status})
		return
	}

	update := bson.M{"updatedAt": time.Now()}
	var responseImageURL string
	var responseError string

	switch task.Output.TaskStatus {
	case "SUCCEEDED":
		imageURL := ""
		if len(task.Output.Choices) > 0 {
			for _, part := range task.Output.Choices[0].Message.Content {
				if part.Type == "image" && part.Image != "" {
					imageURL = part.Image
					break
				}
			}
		}
		if imageURL == "" {
			update["status"] = models.ImageJobFailed
			update["error"] = "Aucune image retournee"
			responseError = update["error"].(string)
		} else {
			update["status"] = models.ImageJobSucceeded
			update["imageDataUrl"] = imageURL
			responseImageURL = imageURL

			assistantNow := time.Now()
			assistantMessage := models.Message{
				ID:             primitive.NewObjectID(),
				ConversationID: job.ConversationID,
				Role:           "assistant",
				Content:        `Image generee : "` + job.Prompt + `"`,
				ImageDataURL:   imageURL,
				ModelName:      qwenImageModel,
				CreatedAt:      assistantNow,
				UpdatedAt:      assistantNow,
			}
			_, _ = db.Collection(models.MessagesCollection).InsertOne(ctx, assistantMessage)

			var conversation models.Conversation
			if err := db.Collection(models.ConversationsCollection).FindOne(ctx, bson.M{"_id": job.ConversationID}).Decode(&conversation); err == nil &&
				conversation.Title == models.DefaultConversationTitle {
				title := job.Prompt
				if len(title) > 60 {
					title = title[:60]
				}
				_, _ = db.Collection(models.ConversationsCollection).UpdateOne(ctx,
					bson.M{"_id": conversation.ID}, bson.M{"$set": bson.M{"title": title, "updatedAt": time.Now()}})
			}

			if sub, err := services.GetOrCreateSubscription(ctx, job.UserID); err == nil {
				_ = services.DeductCredits(ctx, sub, imageGenCreditCost)
			}
		}
	case "FAILED":
		update["status"] = models.ImageJobFailed
		msg := task.Output.Message
		if msg == "" {
			msg = "Echec de la generation d'image"
		}
		update["error"] = msg
		responseError = msg
	case "RUNNING":
		update["status"] = models.ImageJobRunning
	default:
		update["status"] = models.ImageJobPending
	}
	_, _ = db.Collection(models.ImageJobsCollection).UpdateOne(ctx, bson.M{"_id": job.ID}, bson.M{"$set": update})

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"status":       update["status"],
		"imageDataUrl": responseImageURL,
		"error":        responseError,
	})
}
