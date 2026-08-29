package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const MusicJobsCollection = "music_jobs"

const (
	MusicJobRunning   = "RUNNING"
	MusicJobSucceeded = "SUCCEEDED"
	MusicJobFailed    = "FAILED"
)

// MusicJob tracks a background song-generation job (Hugging Face MusicGen,
// see handlers/ai_music.go): created RUNNING, flipped to SUCCEEDED/FAILED by
// the goroutine that does the actual generation. Unlike VideoJob there's no
// external task_id to poll - HF's Inference API is a single synchronous call
// from this backend's side, just slow enough (cold starts) that it runs in
// the background rather than inside the HTTP request.
type MusicJob struct {
	ID     primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	UserID primitive.ObjectID `bson:"userId" json:"userId"`
	Model  string             `bson:"model" json:"model"`
	Prompt string             `bson:"prompt" json:"prompt"`
	// Lyrics is accepted but currently unused - MusicGen is instrumental-only
	// (see SubmitMusicJob in ai_music.go).
	Lyrics    string    `bson:"lyrics,omitempty" json:"lyrics,omitempty"`
	Status    string    `bson:"status" json:"status"`
	AudioURL  string    `bson:"audioUrl,omitempty" json:"audioUrl,omitempty"`
	Error     string    `bson:"error,omitempty" json:"error,omitempty"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}
