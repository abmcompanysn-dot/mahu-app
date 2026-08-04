package models

import "time"

const SupportMessagesCollection = "support_messages"

// SupportMessage mirrors the previous "Support" sheet.
type SupportMessage struct {
	Date      time.Time `bson:"date"`
	Email     string    `bson:"email"`
	Sujet     string    `bson:"sujet"`
	Message   string    `bson:"message"`
	Statut    string    `bson:"statut"`
	Telephone string    `bson:"telephone,omitempty"`
}
