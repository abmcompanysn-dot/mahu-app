package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const MusicJobsCollection = "music_jobs"

const (
	MusicJobPending   = "PENDING"
	MusicJobRunning   = "RUNNING"
	MusicJobSucceeded = "SUCCEEDED"
	MusicJobFailed    = "FAILED"
)

// MusicJob tracks an async Alibaba (Fun-Music) song-generation task:
// submitted once, then polled until Alibaba reports it done - same
// submit/poll shape as VideoJob, see handlers/ai_music.go.
type MusicJob struct {
	ID     primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	UserID primitive.ObjectID `bson:"userId" json:"userId"`
	Model  string             `bson:"model" json:"model"`
	Prompt string             `bson:"prompt" json:"prompt"`
	// Lyrics is empty when the user asked Fun-Music to write its own lyrics
	// from Prompt alone (see SubmitMusicJob in ai_music.go).
	Lyrics    string    `bson:"lyrics,omitempty" json:"lyrics,omitempty"`
	TaskID    string    `bson:"taskId" json:"-"`
	Status    string    `bson:"status" json:"status"`
	AudioURL  string    `bson:"audioUrl,omitempty" json:"audioUrl,omitempty"`
	Error     string    `bson:"error,omitempty" json:"error,omitempty"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}
