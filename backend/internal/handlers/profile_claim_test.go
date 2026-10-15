package handlers

import (
	"context"
	"testing"
)

// Only the checks that answer before the database lookup.
func TestProfileSlugProblemRejectsBadAddresses(t *testing.T) {
	for _, slug := range []string{"", "a", "ab", "-awa", "awa-", "awa..diop", "awa diop", "awa/diop", "admin", "dashboard", "p"} {
		problem, err := profileSlugProblem(context.Background(), normalizeProfileSlug(slug))
		if err != nil || problem == "" {
			t.Errorf("%q devrait etre refusee (problem=%q, err=%v)", slug, problem, err)
		}
	}
	if !profileSlugRegexp.MatchString(normalizeProfileSlug("  Awa.Diop_221 ")) {
		t.Error("awa.diop_221 devrait etre une adresse valide")
	}
}

func TestLeadWhatsAppURL(t *testing.T) {
	cases := map[string]string{
		"WhatsApp : +221771234567":     "https://wa.me/221771234567",
		"Telephone : +229 97 00 00 00": "https://wa.me/22997000000",
		"E-mail : awa@exemple.sn":      "",
		"Instagram : @awa":             "",
		"771234567":                    "",
	}
	for in, want := range cases {
		if got := leadWhatsAppURL(in); got != want {
			t.Errorf("leadWhatsAppURL(%q) = %q, attendu %q", in, got, want)
		}
	}
}

func TestLeadNotificationEscapesVisitorInput(t *testing.T) {
	out := leadNotificationHTML(`<script>x</script>`, "WhatsApp : +221771234567", `"><img src=x>`, "https://call.mahu.cards/login")
	if contains(out, "<script>") || contains(out, "<img src=x>") {
		t.Error("le texte du visiteur doit etre echappe")
	}
	if !contains(out, "https://wa.me/221771234567") {
		t.Error("le bouton WhatsApp manque")
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
