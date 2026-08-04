package handlers

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"mahu-backend/internal/db"
	"mahu-backend/internal/models"
)

func (d *Deps) legacySaveDocument(ctx context.Context, payload map[string]any, user *models.User) (map[string]any, error) {
	url := str(payload, "url")
	docType := str(payload, "type")
	if url == "" || docType == "" {
		return nil, errors.New("Donnees de document invalides.")
	}

	// Une carte d'identite (recto/verso) ne peut avoir qu'une version : on
	// supprime l'ancienne avant d'inserer la nouvelle.
	if docType == "card_front" || docType == "card_back" {
		if _, err := db.Collection(models.LegacyDocumentsCollection).DeleteMany(ctx,
			bson.M{"userId": user.ID, "type": docType}); err != nil {
			return nil, err
		}
	}

	name := str(payload, "name")
	if name == "" {
		name = docType
	}

	doc := models.LegacyDocument{
		ID:        primitive.NewObjectID(),
		UserID:    user.ID,
		Type:      docType,
		Nom:       name,
		URL:       url,
		DateAjout: time.Now(),
	}
	if _, err := db.Collection(models.LegacyDocumentsCollection).InsertOne(ctx, doc); err != nil {
		return nil, err
	}

	return map[string]any{"success": true}, nil
}

func (d *Deps) legacyDeleteDocument(ctx context.Context, docID string, user *models.User) (map[string]any, error) {
	objID, err := primitive.ObjectIDFromHex(docID)
	if err != nil {
		return map[string]any{"success": false, "error": "Document non trouve ou acces refuse."}, nil
	}

	res, err := db.Collection(models.LegacyDocumentsCollection).DeleteOne(ctx, bson.M{"_id": objID, "userId": user.ID})
	if err != nil {
		return nil, err
	}
	if res.DeletedCount == 0 {
		return map[string]any{"success": false, "error": "Document non trouve ou acces refuse."}, nil
	}
	return map[string]any{"success": true}, nil
}
