package middleware

import (
	"context"
	"net/http"
	"strings"

	"mahu-backend/internal/authutil"
	"mahu-backend/internal/httpx"
)

type ctxKey string

const (
	adminCtxKey ctxKey = "admin"
	userCtxKey  ctxKey = "authUser"
)

func bearerToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}
	return ""
}

// RequireServiceKey only lets requests through that carry the shared secret
// only the Next.js server-side proxy knows — the browser never sees it, so
// this rejects any request that didn't come through app/api/backend/route.ts.
func RequireServiceKey(serviceAPIKey string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := r.Header.Get("x-api-key")
			if key == "" || key != serviceAPIKey {
				httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func RequireAdminAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := bearerToken(r)
			if token == "" {
				httpx.WriteError(w, http.StatusUnauthorized, "Missing token")
				return
			}
			claims, err := authutil.VerifyAdminToken(jwtSecret, token)
			if err != nil {
				httpx.WriteError(w, http.StatusUnauthorized, "Invalid or expired token")
				return
			}
			ctx := context.WithValue(r.Context(), adminCtxKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireUserAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := bearerToken(r)
			if token == "" {
				httpx.WriteError(w, http.StatusUnauthorized, "Missing token")
				return
			}
			claims, err := authutil.VerifyUserToken(jwtSecret, token)
			if err != nil {
				httpx.WriteError(w, http.StatusUnauthorized, "Invalid or expired token")
				return
			}
			ctx := context.WithValue(r.Context(), userCtxKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func Admin(r *http.Request) (*authutil.AdminClaims, bool) {
	claims, ok := r.Context().Value(adminCtxKey).(*authutil.AdminClaims)
	return claims, ok
}

func User(r *http.Request) (*authutil.UserClaims, bool) {
	claims, ok := r.Context().Value(userCtxKey).(*authutil.UserClaims)
	return claims, ok
}

// Chain applies middlewares left-to-right, i.e. Chain(h, A, B) runs A(B(h)).
func Chain(h http.Handler, mws ...func(http.Handler) http.Handler) http.Handler {
	for i := len(mws) - 1; i >= 0; i-- {
		h = mws[i](h)
	}
	return h
}
