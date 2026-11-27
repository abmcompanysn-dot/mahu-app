package models

import (
	"testing"
	"time"
)

func TestSessionValid(t *testing.T) {
	change := time.Date(2026, 11, 27, 20, 0, 0, 500, time.UTC)
	u := &User{SessionsValidAfter: &change}
	if u.SessionValid(change.Add(-time.Hour)) {
		t.Fatal("un jeton emis avant le changement de mot de passe doit etre refuse")
	}
	if !u.SessionValid(change.Truncate(time.Second)) || !u.SessionValid(change.Add(time.Minute)) {
		t.Fatal("un jeton emis apres le changement doit rester valide")
	}
	if !(&User{}).SessionValid(time.Now()) {
		t.Fatal("compte normal : jeton valide")
	}
	if (&User{Disabled: true}).SessionValid(time.Now()) {
		t.Fatal("compte desactive : jeton refuse")
	}
}
