package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"mime/multipart"
	"net/http"
	"regexp"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/config"
	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/models"
	"mahu-backend/internal/services"
)

func currentUserID(w http.ResponseWriter, r *http.Request) (primitive.ObjectID, bool) {
	return requireUserObjID(w, r)
}

func (d *Deps) ListModels(w http.ResponseWriter, r *http.Request) {
	userID, ok := currentUserID(w, r)
	if !ok {
		return
	}
	sub, err := services.GetOrCreateSubscription(r.Context(), userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	plan := sub.Plan
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"plan":          plan,
		"creditBalance": sub.CreditBalance,
		"models":        config.AIPlans[plan].Models,
	})
}

func (d *Deps) ListConversations(w http.ResponseWriter, r *http.Request) {
	userID, ok := currentUserID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()
	cursor, err := db.Collection(models.ConversationsCollection).Find(ctx,
		bson.M{"userId": userID}, options.Find().SetSort(bson.D{{Key: "updatedAt", Value: -1}}))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	var conversations []models.Conversation
	if err := cursor.All(ctx, &conversations); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if conversations == nil {
		conversations = []models.Conversation{}
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"conversations": conversations})
}

type createConversationRequest struct {
	Model string `json:"model"`
}

func (d *Deps) CreateConversation(w http.ResponseWriter, r *http.Request) {
	var req createConversationRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || req.Model == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	userID, ok := currentUserID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()
	sub, err := services.GetOrCreateSubscription(ctx, userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if !config.IsModelAllowedForPlan(sub.Plan, req.Model) {
		httpx.WriteError(w, http.StatusForbidden, "Model not allowed for your plan")
		return
	}

	now := time.Now()
	conversation := models.Conversation{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Title:     models.DefaultConversationTitle,
		ModelName: req.Model,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if _, err := db.Collection(models.ConversationsCollection).InsertOne(ctx, conversation); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, map[string]any{"conversation": conversation})
}

func (d *Deps) DeleteConversation(w http.ResponseWriter, r *http.Request, conversationID string) {
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
	err = db.Collection(models.ConversationsCollection).FindOne(ctx, bson.M{"_id": convObjID, "userId": userID}).Decode(&conversation)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Conversation not found")
		return
	}

	if _, err := db.Collection(models.MessagesCollection).DeleteMany(ctx, bson.M{"conversationId": conversation.ID}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if _, err := db.Collection(models.ConversationsCollection).DeleteOne(ctx, bson.M{"_id": conversation.ID}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (d *Deps) ListMessages(w http.ResponseWriter, r *http.Request, conversationID string) {
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
	err = db.Collection(models.ConversationsCollection).FindOne(ctx, bson.M{"_id": convObjID, "userId": userID}).Decode(&conversation)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Conversation not found")
		return
	}

	cursor, err := db.Collection(models.MessagesCollection).Find(ctx,
		bson.M{"conversationId": conversation.ID}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}}))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	var messages []models.Message
	if err := cursor.All(ctx, &messages); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if messages == nil {
		messages = []models.Message{}
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"messages": messages})
}

var imageDataURLRegexp = regexp.MustCompile(`^data:image/(png|jpe?g|webp|gif);base64,`)

type sendMessageRequest struct {
	Content      string `json:"content"`
	ImageDataURL string `json:"imageDataUrl"`
}

type litellmContentPart struct {
	Type     string           `json:"type"`
	Text     string           `json:"text,omitempty"`
	ImageURL *litellmImageURL `json:"image_url,omitempty"`
}

type litellmImageURL struct {
	URL string `json:"url"`
}

func buildContent(text, imageDataURL string) any {
	if imageDataURL == "" {
		return text
	}
	return []litellmContentPart{
		{Type: "text", Text: text},
		{Type: "image_url", ImageURL: &litellmImageURL{URL: imageDataURL}},
	}
}

type litellmChatMessage struct {
	Role    string `json:"role"`
	Content any    `json:"content"`
}

type litellmChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
	} `json:"usage"`
}

func (d *Deps) SendMessage(w http.ResponseWriter, r *http.Request, conversationID string) {
	var req sendMessageRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	if len(req.Content) == 0 || len(req.Content) > 8000 {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	if req.ImageDataURL != "" {
		if len(req.ImageDataURL) > 6_000_000 || !imageDataURLRegexp.MatchString(req.ImageDataURL) {
			httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
			return
		}
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
	err = db.Collection(models.ConversationsCollection).FindOne(ctx, bson.M{"_id": convObjID, "userId": userID}).Decode(&conversation)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Conversation not found")
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

	// Fall back to the free model once credits run out, instead of blocking the user.
	model := config.FreeModel
	if sub.CreditBalance > 0 && config.IsModelAllowedForPlan(sub.Plan, conversation.ModelName) {
		model = conversation.ModelName
	}

	historyCursor, err := db.Collection(models.MessagesCollection).Find(ctx,
		bson.M{"conversationId": conversation.ID}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}}))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	var history []models.Message
	if err := historyCursor.All(ctx, &history); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	now := time.Now()
	userMessage := models.Message{
		ID:             primitive.NewObjectID(),
		ConversationID: conversation.ID,
		Role:           "user",
		Content:        req.Content,
		ImageDataURL:   req.ImageDataURL,
		ModelName:      model,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if _, err := db.Collection(models.MessagesCollection).InsertOne(ctx, userMessage); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	chatMessages := make([]litellmChatMessage, 0, len(history)+1)
	for _, m := range history {
		chatMessages = append(chatMessages, litellmChatMessage{Role: m.Role, Content: buildContent(m.Content, m.ImageDataURL)})
	}
	chatMessages = append(chatMessages, litellmChatMessage{Role: "user", Content: buildContent(req.Content, req.ImageDataURL)})

	reqBody, _ := json.Marshal(map[string]any{"model": model, "messages": chatMessages})
	litellmReq, _ := http.NewRequest("POST", d.Env.LiteLLMURL+"/chat/completions", bytes.NewReader(reqBody))
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

	var data litellmChatResponse
	if err := json.NewDecoder(litellmResp.Body).Decode(&data); err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "AI provider error")
		return
	}

	replyContent := ""
	if len(data.Choices) > 0 {
		replyContent = data.Choices[0].Message.Content
	}
	tokensIn := data.Usage.PromptTokens
	tokensOut := data.Usage.CompletionTokens

	assistantNow := time.Now()
	assistantMessage := models.Message{
		ID:             primitive.NewObjectID(),
		ConversationID: conversation.ID,
		Role:           "assistant",
		Content:        replyContent,
		ModelName:      model,
		TokensIn:       tokensIn,
		TokensOut:      tokensOut,
		CreatedAt:      assistantNow,
		UpdatedAt:      assistantNow,
	}
	if _, err := db.Collection(models.MessagesCollection).InsertOne(ctx, assistantMessage); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	update := bson.M{"modelName": model, "updatedAt": time.Now()}
	if conversation.Title == models.DefaultConversationTitle {
		title := req.Content
		if len(title) > 60 {
			title = title[:60]
		}
		update["title"] = title
	}
	if _, err := db.Collection(models.ConversationsCollection).UpdateOne(ctx, bson.M{"_id": conversation.ID}, bson.M{"$set": update}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	// Simple 1 credit per ~500 tokens metric, cheap enough to compute inline.
	creditsUsed := (tokensIn + tokensOut) / 500
	if creditsUsed < 1 {
		creditsUsed = 1
	}
	if err := services.DeductCredits(ctx, sub, creditsUsed); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"userMessage":      userMessage,
		"assistantMessage": assistantMessage,
		"creditBalance":    sub.CreditBalance,
		"modelUsed":        model,
	})
}

const imageGenModel = "image-gen"     // OpenAI gpt-image-1, via LiteLLM
const qwenImageModel = "wan2.6-image" // Alibaba DashScope, native async task API
const imageGenCreditCost = 20

type generateImageRequest struct {
	Prompt   string `json:"prompt"`
	Provider string `json:"provider"`
}

type litellmImageResponse struct {
	Data []struct {
		B64JSON string `json:"b64_json"`
		URL     string `json:"url"`
	} `json:"data"`
}

// dashscopeImageTaskResponse mirrors ai_video.go's dashscopeTaskResponse but
// for text2image/image-synthesis, whose result shape is a list of images
// rather than a single video_url - NEW, UNVERIFIED against the live key.
type dashscopeImageTaskResponse struct {
	Output struct {
		TaskID     string `json:"task_id"`
		TaskStatus string `json:"task_status"`
		Results    []struct {
			URL string `json:"url"`
		} `json:"results"`
		Message string `json:"message"`
	} `json:"output"`
	Message string `json:"message"`
}

func (d *Deps) generateImageOpenAI(prompt string) (string, error) {
	reqBody, _ := json.Marshal(map[string]any{
		"model":  imageGenModel,
		"prompt": prompt,
		"n":      1,
		"size":   "1024x1024",
	})
	litellmReq, _ := http.NewRequest("POST", d.Env.LiteLLMURL+"/images/generations", bytes.NewReader(reqBody))
	litellmReq.Header.Set("Content-Type", "application/json")
	litellmReq.Header.Set("Authorization", "Bearer "+d.Env.LiteLLMMasterKey)

	litellmResp, err := http.DefaultClient.Do(litellmReq)
	if err != nil {
		return "", errors.New("LiteLLM injoignable")
	}
	defer litellmResp.Body.Close()

	if litellmResp.StatusCode < 200 || litellmResp.StatusCode >= 300 {
		return "", errors.New("AI provider error")
	}

	var data litellmImageResponse
	if err := json.NewDecoder(litellmResp.Body).Decode(&data); err != nil || len(data.Data) == 0 {
		return "", errors.New("Aucune image retournee")
	}

	image := data.Data[0]
	imageDataURL := image.URL
	if image.B64JSON != "" {
		imageDataURL = "data:image/png;base64," + image.B64JSON
	}
	if imageDataURL == "" {
		return "", errors.New("Aucune image retournee")
	}
	return imageDataURL, nil
}

// generateImageQwen submits to Alibaba's native task API (same pattern as
// SubmitVideoJob in ai_video.go) then polls internally within this single
// request - unlike video, image synthesis is fast enough (single-digit
// seconds typically) that a bounded poll loop here avoids needing a whole
// separate job+poll API/UI just for this provider.
func (d *Deps) generateImageQwen(prompt string) (string, error) {
	reqBody, _ := json.Marshal(map[string]any{
		"model": qwenImageModel,
		"input": map[string]any{"prompt": prompt},
	})
	dsReq, _ := http.NewRequest("POST", d.Env.DashscopeNativeBase()+"/services/aigc/text2image/image-synthesis", bytes.NewReader(reqBody))
	dsReq.Header.Set("Content-Type", "application/json")
	dsReq.Header.Set("Authorization", "Bearer "+d.Env.DashscopeAPIKey)
	dsReq.Header.Set("X-DashScope-Async", "enable")

	dsResp, err := http.DefaultClient.Do(dsReq)
	if err != nil {
		return "", errors.New("Alibaba Cloud injoignable")
	}
	defer dsResp.Body.Close()

	var task dashscopeImageTaskResponse
	if err := json.NewDecoder(dsResp.Body).Decode(&task); err != nil {
		return "", errors.New("Reponse invalide du provider")
	}
	if dsResp.StatusCode < 200 || dsResp.StatusCode >= 300 || task.Output.TaskID == "" {
		msg := task.Message
		if msg == "" {
			msg = "Echec de soumission de la generation d'image"
		}
		return "", errors.New(msg)
	}

	const pollAttempts = 15
	const pollInterval = 2 * time.Second
	for attempt := 0; attempt < pollAttempts; attempt++ {
		time.Sleep(pollInterval)

		pollReq, _ := http.NewRequest("GET", d.Env.DashscopeNativeBase()+"/tasks/"+task.Output.TaskID, nil)
		pollReq.Header.Set("Authorization", "Bearer "+d.Env.DashscopeAPIKey)

		pollResp, err := http.DefaultClient.Do(pollReq)
		if err != nil {
			continue
		}
		var polled dashscopeImageTaskResponse
		decodeErr := json.NewDecoder(pollResp.Body).Decode(&polled)
		pollResp.Body.Close()
		if decodeErr != nil {
			continue
		}

		switch polled.Output.TaskStatus {
		case "SUCCEEDED":
			if len(polled.Output.Results) == 0 || polled.Output.Results[0].URL == "" {
				return "", errors.New("Aucune image retournee")
			}
			return polled.Output.Results[0].URL, nil
		case "FAILED":
			msg := polled.Output.Message
			if msg == "" {
				msg = "Echec de la generation d'image"
			}
			return "", errors.New(msg)
		}
	}
	return "", errors.New("Generation d'image trop longue, reessayez")
}

func (d *Deps) GenerateImage(w http.ResponseWriter, r *http.Request, conversationID string) {
	var req generateImageRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || len(req.Prompt) == 0 || len(req.Prompt) > 2000 {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	provider := req.Provider
	if provider != "openai" {
		provider = "qwen"
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
	err = db.Collection(models.ConversationsCollection).FindOne(ctx, bson.M{"_id": convObjID, "userId": userID}).Decode(&conversation)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Conversation not found")
		return
	}

	if provider == "openai" {
		if d.Env.LiteLLMMasterKey == "" {
			httpx.WriteError(w, http.StatusServiceUnavailable, "AI mode is not configured yet")
			return
		}
	} else if d.Env.DashscopeAPIKey == "" || d.Env.DashscopeAPIBase == "" {
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

	modelUsed := qwenImageModel
	if provider == "openai" {
		modelUsed = imageGenModel
	}

	now := time.Now()
	userMessage := models.Message{
		ID:             primitive.NewObjectID(),
		ConversationID: conversation.ID,
		Role:           "user",
		Content:        req.Prompt,
		ModelName:      modelUsed,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if _, err := db.Collection(models.MessagesCollection).InsertOne(ctx, userMessage); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	var imageDataURL string
	if provider == "openai" {
		imageDataURL, err = d.generateImageOpenAI(req.Prompt)
	} else {
		imageDataURL, err = d.generateImageQwen(req.Prompt)
	}
	if err != nil {
		httpx.WriteError(w, http.StatusBadGateway, err.Error())
		return
	}

	assistantNow := time.Now()
	assistantMessage := models.Message{
		ID:             primitive.NewObjectID(),
		ConversationID: conversation.ID,
		Role:           "assistant",
		Content:        `Image generee : "` + req.Prompt + `"`,
		ImageDataURL:   imageDataURL,
		ModelName:      modelUsed,
		CreatedAt:      assistantNow,
		UpdatedAt:      assistantNow,
	}
	if _, err := db.Collection(models.MessagesCollection).InsertOne(ctx, assistantMessage); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	if conversation.Title == models.DefaultConversationTitle {
		title := req.Prompt
		if len(title) > 60 {
			title = title[:60]
		}
		if _, err := db.Collection(models.ConversationsCollection).UpdateOne(ctx,
			bson.M{"_id": conversation.ID}, bson.M{"$set": bson.M{"title": title, "updatedAt": time.Now()}}); err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
			return
		}
	}

	if err := services.DeductCredits(ctx, sub, imageGenCreditCost); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"userMessage":      userMessage,
		"assistantMessage": assistantMessage,
		"creditBalance":    sub.CreditBalance,
		"modelUsed":        modelUsed,
	})
}

const editImageModel = "qwen-image-edit"
const editImageCreditCost = 20

type editImageRequest struct {
	Prompt       string `json:"prompt"`
	ImageDataURL string `json:"imageDataUrl"`
}

// decodeImageDataURL splits a "data:image/png;base64,AAAA..." string into its
// mime type and raw bytes, for building the multipart request LiteLLM's
// OpenAI-compatible /images/edits route expects (unlike /images/generations,
// edits take the source image as a file part, not JSON).
func decodeImageDataURL(dataURL string) (mimeType string, raw []byte, err error) {
	parts := strings.SplitN(dataURL, ",", 2)
	if len(parts) != 2 {
		return "", nil, errImageDataURLFormat
	}
	header := strings.TrimSuffix(strings.TrimPrefix(parts[0], "data:"), ";base64")
	raw, err = base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", nil, err
	}
	return header, raw, nil
}

var errImageDataURLFormat = httpxErr("malformed data URL")

type httpxErr string

func (e httpxErr) Error() string { return string(e) }

// EditImage lets the user upload an existing image plus an instruction and
// get back an edited version, using Qwen's image-edit model. Mirrors
// GenerateImage's credit/message bookkeeping, but calls LiteLLM's
// /images/edits endpoint (multipart, source image required) instead of
// /images/generations (JSON, text-to-image only).
func (d *Deps) EditImage(w http.ResponseWriter, r *http.Request, conversationID string) {
	var req editImageRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || len(req.Prompt) == 0 || len(req.Prompt) > 2000 {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	if req.ImageDataURL == "" || !imageDataURLRegexp.MatchString(req.ImageDataURL) {
		httpx.WriteError(w, http.StatusBadRequest, "Une image source est requise")
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
	err = db.Collection(models.ConversationsCollection).FindOne(ctx, bson.M{"_id": convObjID, "userId": userID}).Decode(&conversation)
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "Conversation not found")
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
	if sub.CreditBalance < editImageCreditCost {
		httpx.WriteError(w, http.StatusPaymentRequired, "Credits insuffisants pour editer une image")
		return
	}

	mimeType, imageBytes, err := decodeImageDataURL(req.ImageDataURL)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Image source invalide")
		return
	}
	ext := "png"
	if slash := strings.Index(mimeType, "/"); slash != -1 && slash+1 < len(mimeType) {
		ext = mimeType[slash+1:]
	}

	now := time.Now()
	userMessage := models.Message{
		ID:             primitive.NewObjectID(),
		ConversationID: conversation.ID,
		Role:           "user",
		Content:        req.Prompt,
		ImageDataURL:   req.ImageDataURL,
		ModelName:      editImageModel,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if _, err := db.Collection(models.MessagesCollection).InsertOne(ctx, userMessage); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("image", "source."+ext)
	if err == nil {
		_, err = part.Write(imageBytes)
	}
	if err == nil {
		err = writer.WriteField("prompt", req.Prompt)
	}
	if err == nil {
		err = writer.WriteField("model", editImageModel)
	}
	if err == nil {
		err = writer.Close()
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	litellmReq, _ := http.NewRequest("POST", d.Env.LiteLLMURL+"/images/edits", &body)
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

	var data litellmImageResponse
	if err := json.NewDecoder(litellmResp.Body).Decode(&data); err != nil || len(data.Data) == 0 {
		httpx.WriteError(w, http.StatusBadGateway, "Aucune image retournee")
		return
	}

	image := data.Data[0]
	imageDataURL := image.URL
	if image.B64JSON != "" {
		imageDataURL = "data:image/png;base64," + image.B64JSON
	}
	if imageDataURL == "" {
		httpx.WriteError(w, http.StatusBadGateway, "Aucune image retournee")
		return
	}

	assistantNow := time.Now()
	assistantMessage := models.Message{
		ID:             primitive.NewObjectID(),
		ConversationID: conversation.ID,
		Role:           "assistant",
		Content:        `Image modifiee : "` + req.Prompt + `"`,
		ImageDataURL:   imageDataURL,
		ModelName:      editImageModel,
		CreatedAt:      assistantNow,
		UpdatedAt:      assistantNow,
	}
	if _, err := db.Collection(models.MessagesCollection).InsertOne(ctx, assistantMessage); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	if conversation.Title == models.DefaultConversationTitle {
		title := req.Prompt
		if len(title) > 60 {
			title = title[:60]
		}
		if _, err := db.Collection(models.ConversationsCollection).UpdateOne(ctx,
			bson.M{"_id": conversation.ID}, bson.M{"$set": bson.M{"title": title, "updatedAt": time.Now()}}); err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
			return
		}
	}

	if err := services.DeductCredits(ctx, sub, editImageCreditCost); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"userMessage":      userMessage,
		"assistantMessage": assistantMessage,
		"creditBalance":    sub.CreditBalance,
		"modelUsed":        editImageModel,
	})
}
