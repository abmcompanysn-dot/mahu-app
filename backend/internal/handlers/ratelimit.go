package handlers

import (
	"context"
	"time"

	"mahu-backend/internal/db"
)

// Limite d'essais par compte (connexion, code 2FA, mot de passe oublie).
// Les requetes passent par le proxy Next.js : le backend ne voit pas l'IP du
// visiteur, on compte donc par email / compte. Compteurs dans Redis ; si
// Redis est indisponible on laisse passer (pas de blocage du service).

type attemptLimit struct {
	scope  string
	max    int64
	window time.Duration
}

var (
	limitUserLogin  = attemptLimit{"login", 8, 15 * time.Minute}
	limitAdminLogin = attemptLimit{"admin-login", 5, 15 * time.Minute}
	limitAdmin2FA   = attemptLimit{"admin-2fa", 5, 15 * time.Minute}
	limitForgotPwd  = attemptLimit{"forgot", 3, time.Hour}
)

func (l attemptLimit) key(id string) string { return "ratelimit:" + l.scope + ":" + id }

// blocked indique si le compte a deja atteint le maximum d'echecs.
func (l attemptLimit) blocked(ctx context.Context, id string) bool {
	if db.Redis == nil || id == "" {
		return false
	}
	n, err := db.Redis.Get(ctx, l.key(id)).Int64()
	return err == nil && n >= l.max
}

// fail compte un echec (ou une demande, pour le mot de passe oublie).
func (l attemptLimit) fail(ctx context.Context, id string) {
	if db.Redis == nil || id == "" {
		return
	}
	k := l.key(id)
	if n, err := db.Redis.Incr(ctx, k).Result(); err == nil && n == 1 {
		db.Redis.Expire(ctx, k, l.window)
	}
}

// reset efface le compteur apres une connexion reussie.
func (l attemptLimit) reset(ctx context.Context, id string) {
	if db.Redis != nil && id != "" {
		db.Redis.Del(ctx, l.key(id))
	}
}

const tooManyAttemptsMsg = "Trop de tentatives. Reessaie dans 15 minutes."
