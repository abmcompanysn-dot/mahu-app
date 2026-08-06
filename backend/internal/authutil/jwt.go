package authutil

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type AdminClaims struct {
	Type  string `json:"type"`
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

type UserClaims struct {
	Type  string `json:"type"`
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

func (c *AdminClaims) Sub() string { return c.RegisteredClaims.Subject }
func (c *UserClaims) Sub() string  { return c.RegisteredClaims.Subject }

func SignAdminToken(secret, sub, email, role string) (string, error) {
	now := time.Now()
	claims := AdminClaims{
		Type:  "admin",
		Email: email,
		Role:  role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   sub,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(12 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// SignAdminPendingToken issues a short-lived token proving password
// verification succeeded, used only to carry the admin through the second
// (TOTP code) step of login. VerifyAdminToken rejects it outright since its
// Type is "admin_pending", not "admin" - it can never be used against
// RequireAdminAuth.
func SignAdminPendingToken(secret, sub, email string) (string, error) {
	now := time.Now()
	claims := AdminClaims{
		Type:  "admin_pending",
		Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   sub,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(5 * time.Minute)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func VerifyAdminPendingToken(secret, tokenString string) (*AdminClaims, error) {
	claims := &AdminClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired token")
	}
	if claims.Type != "admin_pending" {
		return nil, errors.New("not a pending admin token")
	}
	return claims, nil
}

func SignUserToken(secret, sub, email, role string) (string, error) {
	now := time.Now()
	claims := UserClaims{
		Type:  "user",
		Email: email,
		Role:  role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   sub,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(30 * 24 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func VerifyAdminToken(secret, tokenString string) (*AdminClaims, error) {
	claims := &AdminClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired token")
	}
	if claims.Type != "admin" {
		return nil, errors.New("not an admin token")
	}
	return claims, nil
}

func VerifyUserToken(secret, tokenString string) (*UserClaims, error) {
	claims := &UserClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired token")
	}
	if claims.Type != "user" {
		return nil, errors.New("not a user token")
	}
	return claims, nil
}
