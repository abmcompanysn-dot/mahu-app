package handlers

import (
	"encoding/json"
	"strings"
	"unicode"
)

// unsafeLink repere les adresses qui executent du code dans le navigateur
// (javascript:, vbscript:, data:text/html), meme deguisees par des espaces,
// des caracteres invisibles ou des majuscules.
func unsafeLink(s string) bool {
	var b strings.Builder
	for _, r := range s {
		if unicode.IsSpace(r) || unicode.IsControl(r) {
			continue
		}
		b.WriteRune(unicode.ToLower(r))
	}
	v := b.String()
	return strings.Contains(v, "javascript:") || strings.Contains(v, "vbscript:") || strings.Contains(v, "data:text/html")
}

// unsafeJSONLinks verifie toutes les chaines d'un champ JSON (liens sociaux,
// services) apres decodage, pour attraper aussi les echappements \u00XX.
func unsafeJSONLinks(raw string) bool {
	var v any
	if err := json.Unmarshal([]byte(raw), &v); err != nil {
		return unsafeLink(raw)
	}
	var walk func(any) bool
	walk = func(x any) bool {
		switch t := x.(type) {
		case string:
			return unsafeLink(t)
		case []any:
			for _, e := range t {
				if walk(e) {
					return true
				}
			}
		case map[string]any:
			for _, e := range t {
				if walk(e) {
					return true
				}
			}
		}
		return false
	}
	return walk(v)
}
