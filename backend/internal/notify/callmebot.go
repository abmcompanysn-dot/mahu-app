package notify

import (
	"log"
	"net/http"
	"net/url"
	"strings"

	"mahu-backend/internal/config"
)

// SendWhatsApp mirrors the previous sendCallMeBotMessage(text) - a best-effort
// WhatsApp notification to the admin's phone via the CallMeBot API. Errors
// are logged, never surfaced to the caller, matching the original's
// try/catch-and-log behaviour.
func SendWhatsApp(env *config.Env, text string) {
	phone := strings.TrimSpace(env.CallMeBotPhone)
	apiKey := env.CallMeBotAPIKey
	if phone == "" || apiKey == "" || phone == "+1234567890" {
		log.Println("[notify] CallMeBot non configure.")
		return
	}
	if !strings.HasPrefix(phone, "+") {
		phone = "+" + phone
	}

	target := "https://api.callmebot.com/whatsapp.php?phone=" + url.QueryEscape(phone) +
		"&text=" + url.QueryEscape(text) + "&apikey=" + url.QueryEscape(apiKey)

	resp, err := http.Get(target)
	if err != nil {
		log.Printf("[notify] CallMeBot error: %v", err)
		return
	}
	defer resp.Body.Close()
}
