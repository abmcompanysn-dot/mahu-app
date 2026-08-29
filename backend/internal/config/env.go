package config

import (
	"fmt"
	"os"
	"strings"
)

type Env struct {
	Port          string
	MongoURI      string
	RedisURL      string
	JWTSecret     string
	ServiceAPIKey string
	CORSOrigin    string

	FirebaseProjectID   string
	FirebaseClientEmail string
	FirebasePrivateKey  string

	LiteLLMURL       string
	LiteLLMMasterKey string

	PaydunyaMasterKey  string
	PaydunyaPrivateKey string
	PaydunyaPublicKey  string
	PaydunyaToken      string
	PaydunyaMode       string
	PaydunyaWebhookURL string
	AppURL             string

	// SMTP - transactional emails (welcome, password reset, lead/support
	// notifications), replacing the previous GmailApp integration.
	SMTPHost      string
	SMTPPort      string
	SMTPUser      string
	SMTPPassword  string
	SMTPFromName  string
	SMTPFromEmail string

	// CallMeBot - WhatsApp notifications to the admin (new orders, support
	// messages, card activations), previously read from the 'Configuration' sheet.
	CallMeBotPhone  string
	CallMeBotAPIKey string

	// Comma-separated list of emails allowed to perform super-admin-only
	// legacy actions (adminRegisterClient, adminCreateReseller, adminGenerateCardCodes,
	// adminAssignCardLot, adminBroadcastMessage) - previously hardcoded in Code.gs.
	SuperAdminEmails []string

	// Unsigned Cloudinary upload preset already used client-side (see
	// lib/cloudinary.ts) - reused server-side for adminRegisterClient's
	// photo/cover uploads, replacing the previous Google Drive upload.
	CloudinaryCloudName    string
	CloudinaryUploadPreset string

	// Alibaba Cloud Model Studio (Qwen). DashscopeAPIBase is the OpenAI-
	// compatible endpoint (used by litellm/config.yaml for chat/vision).
	// Video generation (wan2.x) has no OpenAI-shaped equivalent, so the Go
	// backend calls Alibaba's native async task API directly - see
	// DashscopeNativeBase() - bypassing LiteLLM for that one feature.
	DashscopeAPIKey  string
	DashscopeAPIBase string

	// Hugging Face Inference API - free-tier music generation (facebook/
	// musicgen-small), used instead of Alibaba's Fun-Music because that one
	// turned out to be Beijing-region-only and unavailable on this account's
	// ap-southeast-1 workspace (see ai_music.go). Free account, "Read" token,
	// rate-limited (~1000 req/day) with a cold-start delay - acceptable given
	// the feature already runs as an async submit/poll job.
	HuggingFaceAPIKey string

	// PawaPay - mobile money checkout (Orange Money, Wave, Free Money, etc.),
	// coexists with PayDunya as a second payment option. Countries is the
	// list of ISO3 country codes to offer on the hosted checkout page (all
	// sharing PawaPayCurrency) - kept configurable rather than hardcoding
	// "every country PawaPay supports", since actual coverage depends on
	// which corridors PawaPay has approved for this merchant account.
	PawaPayAPIToken  string
	PawaPayMode      string
	PawaPayCountries []string
	PawaPayCurrency  string

	// Google OAuth - lets a Mahu USER (not the platform) connect their own
	// Gmail account so Mahu can send email as them (e.g. following up a
	// captured lead) - the first of the "connecteurs Mahu" (Claude-Connectors-
	// style integrations). GoogleOAuthRedirectURL must be registered verbatim
	// in Google Cloud Console as an authorized redirect URI, and must be this
	// backend's own public URL (not the frontend's) since Google redirects
	// the browser straight back to it.
	GoogleOAuthClientID     string
	GoogleOAuthClientSecret string
	GoogleOAuthRedirectURL  string

	// YouTube reuses the same Google OAuth client as Gmail (same Google Cloud
	// project, YouTube Data API enabled, extra redirect URI registered) - only
	// the redirect URL differs since Google matches it exactly per request.
	// Connect + channel identification only - no publish action (uploading a
	// video needs the far more sensitive youtube.upload scope and Mahu has no
	// video content to publish yet).
	YouTubeRedirectURL string

	// Facebook - connect a Page and post text updates to its feed (e.g.
	// sharing that a lead came in) - developers.facebook.com/apps, "Facebook
	// Login for Business" product. Needs Meta App Review before working for
	// anyone other than the app's own test users/admins.
	FacebookAppID       string
	FacebookAppSecret   string
	FacebookRedirectURL string

	// TikTok - developers.tiktok.com, "Login Kit" product. Connect + profile
	// identification only - posting video needs the Content Posting API,
	// which has stricter review requirements than a basic login connector.
	TikTokClientKey    string
	TikTokClientSecret string
	TikTokRedirectURL  string

	// LinkedIn - developers.linkedin.com, "Share on LinkedIn" + "Sign In with
	// LinkedIn using OpenID Connect" products, scope "openid profile w_member_social".
	LinkedInClientID     string
	LinkedInClientSecret string
	LinkedInRedirectURL  string
}

func (e *Env) PawaPayBaseURL() string {
	if e.PawaPayMode == "production" {
		return "https://api.pawapay.io"
	}
	return "https://api.sandbox.pawapay.io"
}

// DashscopeNativeBase derives the native DashScope task-submission root from
// the OpenAI-compatible base (...maas.aliyuncs.com/compatible-mode/v1 ->
// .../api/v1), matching the "dashScope" URL Alibaba issues alongside the
// OpenAI-compatible one for the same workspace/key.
func (e *Env) DashscopeNativeBase() string {
	return strings.Replace(e.DashscopeAPIBase, "/compatible-mode/v1", "/api/v1", 1)
}

func getDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// Load reads and validates the process environment, first loading backend/.env
// (if present) the same way the previous Node backend did via dotenv/config.
// On invalid configuration it returns an error listing every problem found,
// mirroring the zod .flatten() field errors the Node version used to print.
func Load() (*Env, error) {
	loadDotEnv(".env")

	var problems []string
	require := func(key string) string {
		v := os.Getenv(key)
		if v == "" {
			problems = append(problems, fmt.Sprintf("%s is required", key))
		}
		return v
	}
	requireMin := func(key string, min int) string {
		v := os.Getenv(key)
		if len(v) < min {
			problems = append(problems, fmt.Sprintf("%s must be at least %d characters", key, min))
		}
		return v
	}

	env := &Env{
		Port:          getDefault("PORT", "4000"),
		MongoURI:      require("MONGO_URI"),
		RedisURL:      require("REDIS_URL"),
		JWTSecret:     requireMin("JWT_SECRET", 16),
		ServiceAPIKey: requireMin("SERVICE_API_KEY", 16),
		CORSOrigin:    getDefault("CORS_ORIGIN", "http://localhost:3000"),

		FirebaseProjectID:   require("FIREBASE_PROJECT_ID"),
		FirebaseClientEmail: require("FIREBASE_CLIENT_EMAIL"),
		FirebasePrivateKey:  require("FIREBASE_PRIVATE_KEY"),

		LiteLLMURL:       getDefault("LITELLM_URL", "http://litellm:4001"),
		LiteLLMMasterKey: getDefault("LITELLM_MASTER_KEY", ""),

		PaydunyaMasterKey:  getDefault("PAYDUNYA_MASTER_KEY", ""),
		PaydunyaPrivateKey: getDefault("PAYDUNYA_PRIVATE_KEY", ""),
		PaydunyaPublicKey:  getDefault("PAYDUNYA_PUBLIC_KEY", ""),
		PaydunyaToken:      getDefault("PAYDUNYA_TOKEN", ""),
		PaydunyaMode:       getDefault("PAYDUNYA_MODE", "test"),
		PaydunyaWebhookURL: getDefault("PAYDUNYA_WEBHOOK_URL", ""),
		AppURL:             getDefault("APP_URL", "http://localhost:3000"),

		SMTPHost:      getDefault("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:      getDefault("SMTP_PORT", "587"),
		SMTPUser:      getDefault("SMTP_USER", ""),
		SMTPPassword:  getDefault("SMTP_PASSWORD", ""),
		SMTPFromName:  getDefault("SMTP_FROM_NAME", "MAHU DIGITAL SYSTEM"),
		SMTPFromEmail: getDefault("SMTP_FROM_EMAIL", ""),

		CallMeBotPhone:  getDefault("CALLMEBOT_PHONE", ""),
		CallMeBotAPIKey: getDefault("CALLMEBOT_API_KEY", ""),

		CloudinaryCloudName:    getDefault("CLOUDINARY_CLOUD_NAME", "dl3cdiz6k"),
		CloudinaryUploadPreset: getDefault("CLOUDINARY_UPLOAD_PRESET", "mahucards"),

		DashscopeAPIKey:  getDefault("DASHSCOPE_API_KEY", ""),
		DashscopeAPIBase: getDefault("DASHSCOPE_API_BASE", ""),

		HuggingFaceAPIKey: getDefault("HUGGINGFACE_API_KEY", ""),

		PawaPayAPIToken: getDefault("PAWAPAY_API_TOKEN", ""),
		PawaPayMode:     getDefault("PAWAPAY_MODE", "sandbox"),
		PawaPayCurrency: getDefault("PAWAPAY_CURRENCY", "XOF"),

		GoogleOAuthClientID:     getDefault("GOOGLE_OAUTH_CLIENT_ID", ""),
		GoogleOAuthClientSecret: getDefault("GOOGLE_OAUTH_CLIENT_SECRET", ""),
		GoogleOAuthRedirectURL:  getDefault("GOOGLE_OAUTH_REDIRECT_URL", ""),
		YouTubeRedirectURL:      getDefault("YOUTUBE_REDIRECT_URL", ""),

		FacebookAppID:       getDefault("FACEBOOK_APP_ID", ""),
		FacebookAppSecret:   getDefault("FACEBOOK_APP_SECRET", ""),
		FacebookRedirectURL: getDefault("FACEBOOK_REDIRECT_URL", ""),

		TikTokClientKey:    getDefault("TIKTOK_CLIENT_KEY", ""),
		TikTokClientSecret: getDefault("TIKTOK_CLIENT_SECRET", ""),
		TikTokRedirectURL:  getDefault("TIKTOK_REDIRECT_URL", ""),

		LinkedInClientID:     getDefault("LINKEDIN_CLIENT_ID", ""),
		LinkedInClientSecret: getDefault("LINKEDIN_CLIENT_SECRET", ""),
		LinkedInRedirectURL:  getDefault("LINKEDIN_REDIRECT_URL", ""),
	}

	pawaPayCountries := getDefault("PAWAPAY_COUNTRIES", "SEN")
	for _, c := range strings.Split(pawaPayCountries, ",") {
		c = strings.ToUpper(strings.TrimSpace(c))
		if c != "" {
			env.PawaPayCountries = append(env.PawaPayCountries, c)
		}
	}

	superAdmins := getDefault("SUPER_ADMIN_EMAILS", "abmcompanysn@gmail.com")
	for _, email := range strings.Split(superAdmins, ",") {
		email = strings.ToLower(strings.TrimSpace(email))
		if email != "" {
			env.SuperAdminEmails = append(env.SuperAdminEmails, email)
		}
	}

	if env.PaydunyaMode != "test" && env.PaydunyaMode != "live" {
		problems = append(problems, "PAYDUNYA_MODE must be one of: test, live")
	}

	if env.PawaPayMode != "sandbox" && env.PawaPayMode != "production" {
		problems = append(problems, "PAWAPAY_MODE must be one of: sandbox, production")
	}

	if env.SMTPUser == "" || env.SMTPPassword == "" {
		problems = append(problems, "SMTP_USER and SMTP_PASSWORD are required (transactional emails: welcome, password reset, notifications)")
	}

	if len(problems) > 0 {
		return nil, fmt.Errorf("invalid environment variables:\n  - %s", strings.Join(problems, "\n  - "))
	}

	return env, nil
}

func (e *Env) IsSuperAdmin(email string) bool {
	email = strings.ToLower(strings.TrimSpace(email))
	for _, s := range e.SuperAdminEmails {
		if s == email {
			return true
		}
	}
	return false
}
