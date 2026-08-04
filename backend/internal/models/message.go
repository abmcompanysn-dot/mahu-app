package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const MessagesCollection = "messages"

type Message struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	ConversationID primitive.ObjectID `bson:"conversationId" json:"conversationId"`
	Role           string             `bson:"role" json:"role"`
	Content        string             `bson:"content" json:"content"`
	ImageDataURL   string             `bson:"imageDataUrl" json:"imageDataUrl,omitempty"`
	ModelName      string             `bson:"modelName" json:"modelName"`
	TokensIn       int                `bson:"tokensIn" json:"tokensIn"`
	TokensOut      int                `bson:"tokensOut" json:"tokensOut"`
	CreatedAt      time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt      time.Time          `bson:"updatedAt" json:"updatedAt"`
}
