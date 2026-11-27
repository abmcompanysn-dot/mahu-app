package middleware

import (
	"context"
	"net/http"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/authutil"
	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/models"
)

// adminMFASetupAllowed : un jeton admin obtenu sans code 2FA ne sert qu'a
// activer la 2FA (obligatoire). Si l'admin l'a deja activee, il doit se
// reconnecter (anciens jetons emis avant cette regle).
func adminMFASetupAllowed(w http.ResponseWriter, r *http.Request, claims *authutil.AdminClaims) bool {
	id, err := primitive.ObjectIDFromHex(claims.Sub())
	if err != nil || db.DB == nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid or expired token")
		return false
	}
	var a models.AdminUser
	opts := options.FindOne().SetProjection(bson.M{"totpEnabled": 1})
	if err := db.Collection(models.AdminUsersCollection).FindOne(r.Context(), bson.M{"_id": id}, opts).Decode(&a); err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid or expired token")
		return false
	}
	if a.TOTPEnabled {
		httpx.WriteError(w, http.StatusUnauthorized, "Session expiree, reconnectez-vous avec votre code 2FA")
		return false
	}
	if r.Method == http.MethodPost && (r.URL.Path == "/api/admin/2fa/setup" || r.URL.Path == "/api/admin/2fa/confirm") {
		return true
	}
	httpx.WriteJSON(w, http.StatusForbidden, map[string]any{
		"error": "Activez la double authentification (2FA) pour acceder a l'admin.",
		"code":  "2FA_SETUP_REQUIRED",
	})
	return false
}

// userSessionValid verifie en base que le compte n'est pas desactive et que la
// session n'a pas ete coupee (mot de passe change) depuis l'emission du jeton.
func userSessionValid(ctx context.Context, claims *authutil.UserClaims) bool {
	id, err := primitive.ObjectIDFromHex(claims.Sub())
	if err != nil || claims.IssuedAt == nil || db.DB == nil {
		return false
	}
	var u models.User
	opts := options.FindOne().SetProjection(bson.M{"disabled": 1, "sessionsValidAfter": 1})
	if err := db.Collection(models.UsersCollection).FindOne(ctx, bson.M{"_id": id}, opts).Decode(&u); err != nil {
		return false
	}
	return u.SessionValid(claims.IssuedAt.Time)
}

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
			if !claims.MFA && !adminMFASetupAllowed(w, r, claims) {
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
			if !userSessionValid(r.Context(), claims) {
				httpx.WriteError(w, http.StatusUnauthorized, "Session expiree, reconnectez-vous")
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
