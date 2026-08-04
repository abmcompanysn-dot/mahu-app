package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const SocialConnectionsCollection = "social_connections"

const (
	SocialProviderFacebook  = "facebook"
	SocialProviderInstagram = "instagram"
	SocialProviderYouTube   = "youtube"
	SocialProviderTikTok    = "tiktok"
	SocialProviderLinkedIn  = "linkedin"
)

// SocialConnection is a Mahu user's own social account, linked via OAuth -
// same "connecteurs Mahu" family as GmailConnection, but these three share
// near-identical OAuth mechanics (authorize/callback/status/disconnect) so
// they share one collection instead of three near-duplicate ones.
// ExternalID/ExternalName hold whatever identifies the connected account per
// provider (Facebook Page id+name, YouTube channel id+title, TikTok open_id+
// display name). PageAccessToken is Facebook-specific (posting to a Page
// needs the Page's own token, not the user's).
type SocialConnection struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"`
	UserID          primitive.ObjectID `bson:"userId"`
	Provider        string             `bson:"provider"`
	ExternalID      string             `bson:"externalId"`
	ExternalName    string             `bson:"externalName"`
	AccessToken     string             `bson:"accessToken"`
	PageAccessToken string             `bson:"pageAccessToken,omitempty"`
	RefreshToken    string             `bson:"refreshToken,omitempty"`
	ConnectedAt     time.Time          `bson:"connectedAt"`
	UpdatedAt       time.Time          `bson:"updatedAt"`
}
