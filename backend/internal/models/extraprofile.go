package models

const ExtraProfilesCollection = "extra_profiles"

// ExtraProfile is an additional public profile owned by an account
// (multi-profils): one login, several cards, each with its own address,
// details, links, photo and stats - e.g. a person with one card per company.
// The main profile stays in "profiles" (one per user, unique userId index);
// extra ones live here so none of the existing userId lookups change.
// Each extra profile consumes one card activation code (CardCode).
type ExtraProfile struct {
	Profile  `bson:",inline"`
	Slug     string `bson:"slug"`
	CardCode string `bson:"cardCode,omitempty"`
}
