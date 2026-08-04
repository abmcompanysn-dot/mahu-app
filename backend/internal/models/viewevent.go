package models

import "time"

const ViewEventsCollection = "view_events"

// ViewEvent mirrors the previous "Statistiques" sheet: one row per profile
// view, used to build the dashboard's traffic-source chart.
type ViewEvent struct {
	ProfileURL string    `bson:"profileUrl"`
	DateHeure  time.Time `bson:"dateHeure"`
	Source     string    `bson:"source"`
}
