package firebaseauth

import (
	"context"
	"encoding/json"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

type serviceAccount struct {
	Type        string `json:"type"`
	ProjectID   string `json:"project_id"`
	PrivateKey  string `json:"private_key"`
	ClientEmail string `json:"client_email"`
	TokenURI    string `json:"token_uri"`
}

// New builds a Firebase Auth client from the individual service-account
// fields the same way the previous config/firebaseAdmin.ts did with cert().
// FIREBASE_PRIVATE_KEY is stored in .env with literal "\n" sequences, they
// need to become real newlines for the PEM key to parse.
func New(ctx context.Context, projectID, clientEmail, privateKey string) (*auth.Client, error) {
	normalizedKey := strings.ReplaceAll(privateKey, `\n`, "\n")

	credJSON, err := json.Marshal(serviceAccount{
		Type:        "service_account",
		ProjectID:   projectID,
		PrivateKey:  normalizedKey,
		ClientEmail: clientEmail,
		TokenURI:    "https://oauth2.googleapis.com/token",
	})
	if err != nil {
		return nil, err
	}

	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID}, option.WithCredentialsJSON(credJSON))
	if err != nil {
		return nil, err
	}

	return app.Auth(ctx)
}
