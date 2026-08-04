package models

import "time"

const ActionLogsCollection = "action_logs"

// ActionLog mirrors the previous "Historique_Actions" sheet.
type ActionLog struct {
	Timestamp  time.Time `bson:"timestamp"`
	Action     string    `bson:"action"`
	Statut     string    `bson:"statut"`
	Message    string    `bson:"message"`
	UserEmail  string    `bson:"userEmail"`
	Suggestion string    `bson:"suggestion,omitempty"`
}

const (
	LogStatusSuccess = "SUCCESS"
	LogStatusError   = "ERROR"
	LogStatusInfo    = "INFO"
	LogStatusWarning = "WARNING"
)
