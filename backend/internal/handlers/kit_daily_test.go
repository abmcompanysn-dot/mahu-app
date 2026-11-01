package handlers

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

// Le planning du frontend doit etre lisible par l'email, jour par jour.
func TestKitPlanRendersEveryDay(t *testing.T) {
	raw, err := os.ReadFile("../../../public/kit/plan.json")
	if err != nil {
		t.Skipf("planning absent: %v", err)
	}
	var plan kitPlan
	if err := json.Unmarshal(raw, &plan); err != nil {
		t.Fatalf("planning illisible: %v", err)
	}
	if len(plan.Days) == 0 {
		t.Fatal("planning vide")
	}
	seen := map[string]bool{}
	for i := range plan.Days {
		day := &plan.Days[i]
		if seen[day.Date] {
			t.Fatalf("jour en double: %s", day.Date)
		}
		seen[day.Date] = true
		if day.Title == "" || day.Caption == "" || len(day.Images) == 0 {
			t.Fatalf("jour incomplet: %s", day.Date)
		}
		subject, body := kitEmail(day)
		if !strings.Contains(subject, day.Title) || !strings.Contains(body, "/kit?jour="+day.Date) {
			t.Fatalf("email du %s mal construit", day.Date)
		}
	}
}
