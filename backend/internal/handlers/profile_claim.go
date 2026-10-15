package handlers

import (
	"context"
	"regexp"
	"strings"
)

// Activating a profile address that doesn't exist yet: a visitor who opens
// /p/<adresse> (a QR code or link already printed) is offered to activate it,
// and the address is kept through whichever signup path follows (free card
// code, paid card code or deposit order) - see createLegacyAccount.

var profileSlugRegexp = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{1,38}[a-z0-9]$`)

// Addresses that would be confusing on a public card or collide with a page.
var reservedProfileSlugs = map[string]bool{
	"admin": true, "api": true, "app": true, "ai": true, "aide": true, "avis": true, "c": true, "contact": true,
	"dashboard": true, "help": true, "login": true, "logout": true, "mahu": true, "mahucards": true, "null": true,
	"onboarding": true, "p": true, "register": true, "settings": true, "support": true, "undefined": true, "www": true,
}

func normalizeProfileSlug(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// profileSlugProblem returns "" when the address can be given to a new
// account, otherwise the reason shown to the visitor.
func profileSlugProblem(ctx context.Context, slug string) (string, error) {
	if !profileSlugRegexp.MatchString(slug) || strings.Contains(slug, "..") {
		return "Adresse invalide : de 3 a 40 caracteres, lettres, chiffres, point, tiret ou tiret bas.", nil
	}
	if reservedProfileSlugs[slug] {
		return "Cette adresse est reservee.", nil
	}
	owner, err := findProfileOwnerByURL(ctx, slug)
	if err != nil {
		return "", err
	}
	if owner != nil {
		return "Cette adresse est deja utilisee.", nil
	}
	return "", nil
}

// legacyCheckProfileAvailability is the public "checkProfileAvailability"
// action used by the profile page and the signup form.
func (d *Deps) legacyCheckProfileAvailability(ctx context.Context, profileURL string) (map[string]any, error) {
	slug := normalizeProfileSlug(profileURL)
	problem, err := profileSlugProblem(ctx, slug)
	if err != nil {
		return nil, err
	}
	return map[string]any{"success": true, "profileUrl": slug, "available": problem == "", "reason": problem}, nil
}
