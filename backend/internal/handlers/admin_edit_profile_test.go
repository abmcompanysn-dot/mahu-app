package handlers

import "testing"

func TestValidateAdminLinks(t *testing.T) {
	ok, err := validateAdminLinks(`[{"type":" Instagram ","url":"https://www.instagram.com/x/","label":""},{"type":"whatsapp","url":"https://wa.me/221770000000","label":"WhatsApp","extra":"ignored"}]`)
	if err != nil {
		t.Fatalf("liens valides refuses : %v", err)
	}
	want := `[{"type":"instagram","url":"https://www.instagram.com/x/","label":""},{"type":"whatsapp","url":"https://wa.me/221770000000","label":"WhatsApp"}]`
	if ok != want {
		t.Fatalf("normalisation inattendue :\n%s\nattendu :\n%s", ok, want)
	}

	for _, bad := range []string{
		`not json`,
		`[{"type":"website","url":"javascript:alert(1)","label":""}]`,
		`[{"type":"website","url":"java\tscript:alert(1)","label":""}]`,
		`[{"type":"website","url":"data:text/html,<script>","label":""}]`,
		`[{"type":"website","url":"ftp://x","label":""}]`,
		`[{"type":"<b>","url":"https://x.com","label":""}]`,
	} {
		if _, err := validateAdminLinks(bad); err == nil {
			t.Errorf("lien dangereux accepte : %s", bad)
		}
	}
}

func TestMahuImagePattern(t *testing.T) {
	if !mahuImagePattern.MatchString("https://res.cloudinary.com/dl3cdiz6k/image/upload/v1795231856/obcacbkto5wn8z5nevr8.jpg") {
		t.Error("image Cloudinary MAHU refusee")
	}
	for _, bad := range []string{
		"https://evil.example/x.jpg",
		"https://res.cloudinary.com/autrecompte/image/upload/x.jpg",
		"https://res.cloudinary.com/dl3cdiz6k/image/upload/x.jpg\" onerror=\"alert(1)",
	} {
		if mahuImagePattern.MatchString(bad) {
			t.Errorf("image hors MAHU acceptee : %s", bad)
		}
	}
}
