package handlers

import (
	"net/http"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
)

func Health(w http.ResponseWriter, r *http.Request) {
	mongoStatus := "disconnected"
	if db.IsConnected() {
		mongoStatus = "connected"
	}
	redisStatus := "disconnected"
	if db.RedisReady() {
		redisStatus = "connected"
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"mongo":  mongoStatus,
		"redis":  redisStatus,
	})
}
