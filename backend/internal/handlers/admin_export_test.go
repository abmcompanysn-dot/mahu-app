package handlers

import (
	"strings"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestExportFlatDropsSecrets(t *testing.T) {
	id := primitive.NewObjectID()
	doc := bson.D{
		{Key: "_id", Value: id},
		{Key: "email", Value: "a@b.sn"},
		{Key: "passwordHash", Value: "x"},
		{Key: "cardCode", Value: "FD-123"},
		{Key: "createdAt", Value: primitive.NewDateTimeFromTime(time.Date(2026, 11, 27, 8, 0, 0, 0, time.UTC))},
		{Key: "profile", Value: bson.D{{Key: "name", Value: "Kevin"}, {Key: "apiKey", Value: "k"}}},
		{Key: "links", Value: bson.A{bson.D{{Key: "url", Value: "https://x"}, {Key: "token", Value: "t"}}}},
	}
	row := map[string]string{}
	var keys []string
	exportFlat(doc, "", row, &keys, 0)

	for _, k := range []string{"passwordHash", "profile.apiKey"} {
		if _, ok := row[k]; ok {
			t.Fatalf("%s ne doit pas sortir", k)
		}
	}
	if row["cardCode"] != "FD-123" {
		t.Fatalf("le code d'activation doit sortir: %v", row)
	}
	if row["_id"] != id.Hex() || row["email"] != "a@b.sn" || row["profile.name"] != "Kevin" {
		t.Fatalf("valeurs inattendues: %v", row)
	}
	if row["createdAt"] != "2026-11-27T08:00:00Z" {
		t.Fatalf("date: %q", row["createdAt"])
	}
	if !strings.Contains(row["links"], "https://x") || strings.Contains(row["links"], `"token"`) {
		t.Fatalf("links: %q", row["links"])
	}
}
