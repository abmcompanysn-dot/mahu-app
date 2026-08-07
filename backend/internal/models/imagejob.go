package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const ImageJobsCollection = "image_jobs"

const (
	ImageJobPending   = "PENDING"
	ImageJobRunning   = "RUNNING"
	ImageJobSucceeded = "SUCCEEDED"
	ImageJobFailed    = "FAILED"
)

// ImageJob tracks an async Alibaba (wan2.6-image) image-generation task -
// submitted once, then polled until Alibaba reports it done (typically
// 1-3 minutes, so this can't be a single synchronous request behind
// Cloudflare Tunnel). See handlers/ai_image_qwen.go.
type ImageJob struct {
	ID             primitive.ObjectID `bson:"_id,omitempty"`
	UserID         primitive.ObjectID `bson:"userId"`
	ConversationID primitive.ObjectID `bson:"conversationId"`
	Prompt         string             `bson:"prompt"`
	TaskID         string             `bson:"taskId"`
	Status         string             `bson:"status"`
	ImageDataURL   string             `bson:"imageDataUrl,omitempty"`
	Error          string             `bson:"error,omitempty"`
	CreatedAt      time.Time          `bson:"createdAt"`
	UpdatedAt      time.Time          `bson:"updatedAt"`
}
