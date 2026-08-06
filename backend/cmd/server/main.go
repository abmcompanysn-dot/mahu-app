package main

import (
	"context"
	"log"
	"net/http"

	"mahu-backend/internal/config"
	"mahu-backend/internal/db"
	"mahu-backend/internal/emailutil"
	"mahu-backend/internal/firebaseauth"
	"mahu-backend/internal/handlers"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/middleware"
)

const maxBodyBytes = 8 << 20 // 8mb, matches the previous express.json({ limit: "8mb" })

func main() {
	env, err := config.Load()
	if err != nil {
		log.Fatalf("[backend] %v", err)
	}

	if err := db.ConnectMongo(env.MongoURI); err != nil {
		log.Fatalf("[backend] fatal startup error: mongo: %v", err)
	}
	log.Println("[mongo] connected")

	if err := db.ConnectRedis(env.RedisURL); err != nil {
		log.Fatalf("[backend] fatal startup error: redis: %v", err)
	}
	log.Println("[redis] connected")

	firebaseAuth, err := firebaseauth.New(context.Background(), env.FirebaseProjectID, env.FirebaseClientEmail, env.FirebasePrivateKey)
	if err != nil {
		log.Fatalf("[backend] fatal startup error: firebase: %v", err)
	}

	if err := db.EnsureIndexes(context.Background()); err != nil {
		log.Fatalf("[backend] fatal startup error: indexes: %v", err)
	}

	deps := &handlers.Deps{Env: env, FirebaseAuth: firebaseAuth, Email: emailutil.NewSender(env)}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", handlers.Health)

	// Called directly by PayDunya's/PawaPay's servers, so they must stay ahead
	// of requireServiceKey — each verifies the payment with its own provider
	// directly instead.
	mux.HandleFunc("POST /api/billing/webhook/paydunya", deps.PaydunyaWebhook)
	mux.HandleFunc("POST /api/billing/webhook/pawapay", deps.PawaPayWebhook)

	// Google redirects the user's browser here directly after OAuth consent -
	// no Mahu session cookie/header exists on that request, so this must stay
	// ahead of requireServiceKey too. CSRF-protected via the single-use
	// `state` token instead (see GmailAuthorize/GmailCallback).
	mux.HandleFunc("GET /api/connectors/gmail/callback", deps.GmailCallback)
	mux.HandleFunc("GET /api/connectors/facebook/callback", deps.FacebookCallback)
	mux.HandleFunc("GET /api/connectors/youtube/callback", deps.YouTubeCallback)
	mux.HandleFunc("GET /api/connectors/tiktok/callback", deps.TikTokCallback)
	mux.HandleFunc("GET /api/connectors/linkedin/callback", deps.LinkedInCallback)

	// Every route registered below only accepts requests carrying the
	// service API key, i.e. requests forwarded by the Next.js server through
	// app/api/backend/route.ts — never called directly by browsers.
	protected := http.NewServeMux()

	protected.HandleFunc("POST /api/auth/login", deps.AdminLogin)
	protected.HandleFunc("POST /api/auth/login/verify-2fa", deps.Verify2FA)
	protected.HandleFunc("POST /api/auth/social", deps.SocialLogin)
	protected.HandleFunc("POST /api/auth/face-verify", deps.FaceVerify)
	protected.HandleFunc("GET /api/auth/card-info/{cardCode}", func(w http.ResponseWriter, r *http.Request) {
		deps.GetCardPublicInfo(w, r, r.PathValue("cardCode"))
	})

	adminOnly := middleware.RequireAdminAuth(env.JWTSecret)
	protected.Handle("GET /api/admin/stats", adminOnly(http.HandlerFunc(deps.GetStats)))
	protected.Handle("GET /api/admin/consumption", adminOnly(http.HandlerFunc(deps.GetConsumption)))
	protected.Handle("GET /api/admin/payments", adminOnly(http.HandlerFunc(deps.GetPayments)))
	protected.Handle("GET /api/admin/announcements", adminOnly(http.HandlerFunc(deps.ListAnnouncements)))
	protected.Handle("POST /api/admin/announcements", adminOnly(http.HandlerFunc(deps.CreateAnnouncement)))
	protected.Handle("GET /api/admin/users", adminOnly(http.HandlerFunc(deps.ListUsers)))
	protected.Handle("PATCH /api/admin/users/{id}/plan", adminOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deps.UpdateUserPlan(w, r, r.PathValue("id"))
	})))
	protected.Handle("PATCH /api/admin/users/{id}/disable", adminOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deps.SetUserDisabled(w, r, r.PathValue("id"))
	})))
	protected.Handle("POST /api/admin/2fa/setup", adminOnly(http.HandlerFunc(deps.Setup2FA)))
	protected.Handle("POST /api/admin/2fa/confirm", adminOnly(http.HandlerFunc(deps.Confirm2FA)))
	protected.Handle("POST /api/admin/2fa/disable", adminOnly(http.HandlerFunc(deps.Disable2FA)))

	userOnly := middleware.RequireUserAuth(env.JWTSecret)
	protected.Handle("GET /api/ai/models", userOnly(http.HandlerFunc(deps.ListModels)))
	protected.Handle("GET /api/ai/conversations", userOnly(http.HandlerFunc(deps.ListConversations)))
	protected.Handle("POST /api/ai/conversations", userOnly(http.HandlerFunc(deps.CreateConversation)))
	protected.Handle("DELETE /api/ai/conversations/{id}", userOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deps.DeleteConversation(w, r, r.PathValue("id"))
	})))
	protected.Handle("GET /api/ai/conversations/{id}/messages", userOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deps.ListMessages(w, r, r.PathValue("id"))
	})))
	protected.Handle("POST /api/ai/conversations/{id}/messages", userOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deps.SendMessage(w, r, r.PathValue("id"))
	})))
	protected.Handle("POST /api/ai/conversations/{id}/generate-image", userOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deps.GenerateImage(w, r, r.PathValue("id"))
	})))
	protected.Handle("POST /api/ai/conversations/{id}/edit-image", userOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deps.EditImage(w, r, r.PathValue("id"))
	})))
	protected.Handle("POST /api/ai/speak", userOnly(http.HandlerFunc(deps.SpeakText)))
	protected.Handle("POST /api/ai/transcribe", userOnly(http.HandlerFunc(deps.TranscribeAudio)))
	protected.Handle("POST /api/ai/video", userOnly(http.HandlerFunc(deps.SubmitVideoJob)))
	protected.Handle("GET /api/ai/video/{id}", userOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deps.GetVideoJob(w, r, r.PathValue("id"))
	})))
	protected.Handle("POST /api/ai/embed", userOnly(http.HandlerFunc(deps.EmbedText)))

	protected.Handle("GET /api/ai/card", userOnly(http.HandlerFunc(deps.GetCard)))
	protected.Handle("POST /api/ai/card/enroll-face", userOnly(http.HandlerFunc(deps.EnrollFace)))
	protected.Handle("POST /api/ai/card/disable", userOnly(http.HandlerFunc(deps.DisableCard)))
	protected.Handle("PATCH /api/ai/card/profile-link", userOnly(http.HandlerFunc(deps.UpdateProfileLink)))
	protected.Handle("PATCH /api/ai/card/redirect-mode", userOnly(http.HandlerFunc(deps.UpdateRedirectMode)))

	protected.Handle("POST /api/billing/checkout", userOnly(http.HandlerFunc(deps.CreateCheckout)))
	protected.Handle("POST /api/billing/checkout-pawapay", userOnly(http.HandlerFunc(deps.CreatePawaPayCheckout)))

	protected.Handle("GET /api/connectors/gmail/authorize", userOnly(http.HandlerFunc(deps.GmailAuthorize)))
	protected.Handle("GET /api/connectors/gmail/status", userOnly(http.HandlerFunc(deps.GmailStatus)))
	protected.Handle("POST /api/connectors/gmail/disconnect", userOnly(http.HandlerFunc(deps.GmailDisconnect)))
	protected.Handle("POST /api/connectors/gmail/send", userOnly(http.HandlerFunc(deps.GmailSend)))

	protected.Handle("GET /api/connectors/facebook/authorize", userOnly(http.HandlerFunc(deps.FacebookAuthorize)))
	protected.Handle("POST /api/connectors/facebook/publish", userOnly(http.HandlerFunc(deps.FacebookPublish)))
	protected.Handle("POST /api/connectors/publish-video", userOnly(http.HandlerFunc(deps.PublishVideo)))
	protected.Handle("GET /api/connectors/youtube/authorize", userOnly(http.HandlerFunc(deps.YouTubeAuthorize)))
	protected.Handle("GET /api/connectors/tiktok/authorize", userOnly(http.HandlerFunc(deps.TikTokAuthorize)))
	protected.Handle("GET /api/connectors/linkedin/authorize", userOnly(http.HandlerFunc(deps.LinkedInAuthorize)))

	// Status/disconnect are identical across facebook/youtube/tiktok, so they
	// share one generic handler parameterized by {provider} - see
	// handlers/connectors_social.go. The literal /gmail/status route above
	// still wins for that provider (Go's mux prefers the more specific match).
	protected.Handle("GET /api/connectors/{provider}/status", userOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deps.SocialStatus(w, r, r.PathValue("provider"))
	})))
	protected.Handle("POST /api/connectors/{provider}/disconnect", userOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		deps.SocialDisconnect(w, r, r.PathValue("provider"))
	})))

	// Single action-dispatch endpoint replacing the previous Google Apps
	// Script backend - see app/api/appscript/route.ts (now forwarding here
	// instead of script.google.com) and handlers/legacy_switch.go. Auth is
	// per-action via a token field in the body/query, not this router, so it
	// isn't wrapped in adminOnly/userOnly like the routes above.
	protected.HandleFunc("GET /api/legacy", deps.LegacyGet)
	protected.HandleFunc("POST /api/legacy", deps.LegacyPost)

	protected.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteError(w, http.StatusNotFound, "Not found")
	})

	mux.Handle("/", middleware.RequireServiceKey(env.ServiceAPIKey)(protected))

	handler := middleware.Chain(mux,
		middleware.SecurityHeaders,
		middleware.CORS(env.CORSOrigin),
		middleware.MaxBody(maxBodyBytes),
		middleware.Recover,
	)

	log.Printf("[backend] listening on port %s", env.Port)
	if err := http.ListenAndServe(":"+env.Port, handler); err != nil {
		log.Fatalf("[backend] fatal startup error: %v", err)
	}
}
