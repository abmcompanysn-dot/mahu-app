package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const VideoJobsCollection = "video_jobs"

const (
	VideoJobPending   = "PENDING"
	VideoJobRunning   = "RUNNING"
	VideoJobSucceeded = "SUCCEEDED"
	VideoJobFailed    = "FAILED"
)

// VideoJob tracks an async Alibaba (wan2.x) video-generation task: submitted
// once, then polled until Alibaba reports it done - see handlers/ai_video.go.
type VideoJob struct {
	ID       primitive.ObjectID `bson:"_id,omitempty"`
	UserID   primitive.ObjectID `bson:"userId"`
	Model    string             `bson:"model"`
	Prompt   string             `bson:"prompt"`
	TaskID   string             `bson:"taskId"`
	Status   string             `bson:"status"`
	VideoURL string             `bson:"videoUrl,omitempty"`
	Error    string             `bson:"error,omitempty"`
	// Narration tracks the optional voice-over merge (see
	// handlers.MergeVideoNarration) - runs in the background after the base
	// video succeeds, since re-hosting + mixing on Cloudinary takes well
	// over a minute and would otherwise sit inside a single synchronous HTTP
	// request, timing out the frontend/proxy/tunnel chain in front of it.
	NarrationStatus  string    `bson:"narrationStatus,omitempty"`
	NarratedVideoURL string    `bson:"narratedVideoUrl,omitempty"`
	NarrationError   string    `bson:"narrationError,omitempty"`
	CreatedAt        time.Time `bson:"createdAt"`
	UpdatedAt        time.Time `bson:"updatedAt"`
}
