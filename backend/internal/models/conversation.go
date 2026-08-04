package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const ConversationsCollection = "conversations"

type Conversation struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	UserID    primitive.ObjectID `bson:"userId" json:"userId"`
	Title     string             `bson:"title" json:"title"`
	ModelName string             `bson:"modelName" json:"modelName"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}

const DefaultConversationTitle = "Nouvelle conversation"
