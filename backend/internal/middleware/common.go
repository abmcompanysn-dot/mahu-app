package middleware

import (
	"log"
	"net/http"

	"mahu-backend/internal/httpx"
)

// Recover catches panics in a handler (e.g. an unexpected nil dereference on
// a malformed upstream response) so one bad request can't take the whole
// process down — the Node version relied on Express catching synchronous
// throws plus a process-level unhandledRejection log-and-continue handler;
// this is the Go equivalent for HTTP handlers.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("[backend] panic recovered: %v", err)
				httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// CORS mirrors the previous cors({ origin: env.CORS_ORIGIN }) configuration.
func CORS(origin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key")
			w.Header().Set("Vary", "Origin")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// SecurityHeaders replicates the subset of helmet()'s default headers that
// matter for a JSON-only API (no HTML is ever served here).
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "SAMEORIGIN")
		h.Set("X-DNS-Prefetch-Control", "off")
		h.Set("X-Download-Options", "noopen")
		h.Set("X-Permitted-Cross-Domain-Policies", "none")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Strict-Transport-Security", "max-age=15552000; includeSubDomains")
		next.ServeHTTP(w, r)
	})
}

// MaxBody caps the request body size the same way express.json({ limit: "8mb" })
// did — high enough for base64 image attachments in the AI chat composer.
func MaxBody(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			next.ServeHTTP(w, r)
		})
	}
}
