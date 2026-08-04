package handlers

import (
	fbauth "firebase.google.com/go/v4/auth"

	"mahu-backend/internal/config"
	"mahu-backend/internal/emailutil"
)

// Deps bundles the shared dependencies every handler group needs, mirroring
// what the previous Express controllers pulled in via module-level imports.
type Deps struct {
	Env          *config.Env
	FirebaseAuth *fbauth.Client
	Email        *emailutil.Sender
}
