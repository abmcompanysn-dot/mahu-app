package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	OutreachCampaignsCollection    = "outreach_campaigns"
	OutreachRecipientsCollection   = "outreach_recipients"
	OutreachUnsubscribesCollection = "outreach_unsubscribes"
)

const (
	OutreachCampaignDraft   = "brouillon"
	OutreachCampaignSending = "envoi"
	OutreachCampaignDone    = "termine"

	OutreachRecipientPending      = "en_attente"
	OutreachRecipientSent         = "envoye"
	OutreachRecipientFailed       = "echec"
	OutreachRecipientUnsubscribed = "desinscrit"
)

// OutreachCampaign is an email sent by hand from the admin to existing
// clients (feedback requests, news), from a real person's mahu.cards mailbox
// on the mail server - not the transactional Resend route.
type OutreachCampaign struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	SenderEmail string             `bson:"senderEmail" json:"senderEmail"`
	SenderName  string             `bson:"senderName" json:"senderName"`
	Subject     string             `bson:"subject" json:"subject"`
	// Body is plain text; {prenom} and {nom} are replaced per recipient.
	Body        string    `bson:"body" json:"body"`
	AskFeedback bool      `bson:"askFeedback" json:"askFeedback"`
	Status      string    `bson:"status" json:"status"`
	CreatedBy   string    `bson:"createdBy" json:"createdBy"`
	Total       int       `bson:"total" json:"total"`
	CreatedAt   time.Time `bson:"createdAt" json:"createdAt"`
	StartedAt   time.Time `bson:"startedAt,omitempty" json:"startedAt,omitempty"`
	FinishedAt  time.Time `bson:"finishedAt,omitempty" json:"finishedAt,omitempty"`
}

// OutreachRecipient is one client of a campaign. Token is the unguessable
// key of their feedback / unsubscribe links (no login needed).
type OutreachRecipient struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	CampaignID primitive.ObjectID `bson:"campaignId" json:"campaignId"`
	Email      string             `bson:"email" json:"email"`
	FirstName  string             `bson:"firstName" json:"firstName"`
	LastName   string             `bson:"lastName" json:"lastName"`
	Token      string             `bson:"token" json:"-"`
	Status     string             `bson:"status" json:"status"`
	Error      string             `bson:"error,omitempty" json:"error,omitempty"`
	SentAt     *time.Time         `bson:"sentAt,omitempty" json:"sentAt,omitempty"`
	Rating     int                `bson:"rating,omitempty" json:"rating,omitempty"`
	Comment    string             `bson:"comment,omitempty" json:"comment,omitempty"`
	FeedbackAt *time.Time         `bson:"feedbackAt,omitempty" json:"feedbackAt,omitempty"`
}

// OutreachUnsubscribe blocks every later campaign to this address.
type OutreachUnsubscribe struct {
	Email     string    `bson:"_id" json:"email"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
}
