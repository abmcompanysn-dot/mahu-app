package handlers

import "testing"

func TestUnsafeLink(t *testing.T) {
	bad := []string{"javascript:alert(1)", " JaVa\tScRiPt:x", "vbscript:x", "data:text/html,<b>"}
	for _, s := range bad {
		if !unsafeLink(s) {
			t.Errorf("devrait etre refuse : %q", s)
		}
	}
	good := []string{"https://linkedin.com/in/x", "mailto:a@b.c", "tel:+221770000000", "wa.me/221770000000"}
	for _, s := range good {
		if unsafeLink(s) {
			t.Errorf("devrait etre accepte : %q", s)
		}
	}
	if !unsafeJSONLinks(`[{"type":"website","url":"javascript:alert(1)"}]`) {
		t.Error("lien echappe en JSON non detecte")
	}
	if unsafeJSONLinks(`[{"type":"linkedin","url":"https://linkedin.com"}]`) {
		t.Error("lien normal refuse")
	}
}
