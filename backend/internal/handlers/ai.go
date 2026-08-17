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

// requireAiAccess wraps currentUserID with a check that mode IA is enabled
// for this user - hidden from the dashboard client-side, but this is what
// actually enforces it, since ListModels/CreateConversation are the two
// choke points every /ai interaction passes through first.
func requireAiAccess(w http.ResponseWriter, r *http.Request) (primitive.ObjectID, bool) {
	userID, ok := currentUserID(w, r)
	if !ok {
		return userID, false
	}
	var user models.User
	if err := db.Collection(models.UsersCollection).FindOne(r.Context(), bson.M{"_id": userID}).Decode(&user); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return userID, false
	}
	if !user.AiEnabled {
		httpx.WriteError(w, http.StatusForbidden, "Le mode IA n'est pas encore active pour ton compte")
		return userID, false
	}
	return userID, true
}

func (d *Deps) ListModels(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireAiAccess(w, r)
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
	userID, ok := requireAiAccess(w, r)
	if !ok {
		return
	}

	var req createConversationRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || req.Model == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
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

const imageGenModel = "image-gen" // OpenAI gpt-image-1, via LiteLLM
const imageGenCreditCost = 20

// Qwen (Alibaba) image generation lives in ai_image_qwen.go as a submit+poll
// job pair, not here - DashScope's wan2.6-image takes 1-3 minutes, far past
// what a single synchronous request can survive behind Cloudflare Tunnel
// (~100s edge timeout). This handler stays OpenAI-only, which responds in
// a few seconds.

type generateImageRequest struct {
	Prompt string `json:"prompt"`
}

type litellmImageResponse struct {
	Data []struct {
		B64JSON string `json:"b64_json"`
		URL     string `json:"url"`
	} `json:"data"`
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

func (d *Deps) GenerateImage(w http.ResponseWriter, r *http.Request, conversationID string) {
	var req generateImageRequest
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
		ModelName:      imageGenModel,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if _, err := db.Collection(models.MessagesCollection).InsertOne(ctx, userMessage); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	imageDataURL, err := d.generateImageOpenAI(req.Prompt)
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
		ModelName:      imageGenModel,
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
		"modelUsed":        imageGenModel,
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
