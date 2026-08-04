package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/legacyauth"
	"mahu-backend/internal/models"
)

// Facebook (Page publishing), YouTube (connect + identify only) and TikTok
// (connect + identify only) - NEW, UNVERIFIED (no app credentials available
// for any of the three while building this). All three need their own
// developer app + review before they work for anyone besides the app's own
// test users:
//   - Facebook: developers.facebook.com, App Review for pages_manage_posts
//   - YouTube: reuses the Gmail Google Cloud project, just needs the YouTube
//     Data API enabled and this redirect URI added
//   - TikTok: developers.tiktok.com, "Login Kit" - video.publish (actual
//     posting) needs the separate, stricter Content Posting API, not built
//     here since Mahu has no video content to post yet
//
// Same CSRF-protection pattern as Gmail: a random, single-use `state` stored
// server-side in Redis, not a signed token, so a leaked session JWT can't be
// replayed to link an attacker's account to a victim's Mahu user.

const socialStateTTLSeconds = 600

func socialStateKey(provider, state string) string {
	return "social_oauth_state:" + provider + ":" + state
}

func (d *Deps) beginSocialOAuth(w http.ResponseWriter, r *http.Request, provider string, buildAuthURL func(state string) string) {
	userID, ok := requireUserObjID(w, r)
	if !ok {
		return
	}

	state, err := legacyauth.NewUUID()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	if err := db.SetCache(r.Context(), socialStateKey(provider, state), userID.Hex(), socialStateTTLSeconds); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"authUrl": buildAuthURL(state)})
}

// consumeSocialState verifies and single-use-consumes the state param on a
// callback, returning the Mahu user ID that started the flow.
func consumeSocialState(r *http.Request, provider string) (primitive.ObjectID, bool) {
	state := r.URL.Query().Get("state")
	if state == "" {
		return primitive.NilObjectID, false
	}
	ctx := r.Context()
	userIDHex, err := db.GetCache[string](ctx, socialStateKey(provider, state))
	if err != nil || userIDHex == nil {
		return primitive.NilObjectID, false
	}
	_ = db.InvalidateCache(ctx, socialStateKey(provider, state))
	userID, err := primitive.ObjectIDFromHex(*userIDHex)
	if err != nil {
		return primitive.NilObjectID, false
	}
	return userID, true
}

func upsertSocialConnection(ctx context.Context, userID primitive.ObjectID, provider, externalID, externalName, accessToken, pageAccessToken, refreshToken string) error {
	now := time.Now()
	_, err := db.Collection(models.SocialConnectionsCollection).UpdateOne(ctx,
		bson.M{"userId": userID, "provider": provider},
		bson.M{"$set": bson.M{
			"externalId":      externalID,
			"externalName":    externalName,
			"accessToken":     accessToken,
			"pageAccessToken": pageAccessToken,
			"refreshToken":    refreshToken,
			"updatedAt":       now,
		}, "$setOnInsert": bson.M{"userId": userID, "provider": provider, "connectedAt": now}},
		options.Update().SetUpsert(true),
	)
	return err
}

// SocialStatus and SocialDisconnect are generic across all three providers -
// see main.go's {provider} route.
func (d *Deps) SocialStatus(w http.ResponseWriter, r *http.Request, provider string) {
	userID, ok := requireUserObjID(w, r)
	if !ok {
		return
	}
	var conn models.SocialConnection
	err := db.Collection(models.SocialConnectionsCollection).FindOne(r.Context(),
		bson.M{"userId": userID, "provider": provider}).Decode(&conn)
	if err != nil {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"connected": false})
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"connected": true, "name": conn.ExternalName})
}

func (d *Deps) SocialDisconnect(w http.ResponseWriter, r *http.Request, provider string) {
	userID, ok := requireUserObjID(w, r)
	if !ok {
		return
	}
	if _, err := db.Collection(models.SocialConnectionsCollection).DeleteOne(r.Context(),
		bson.M{"userId": userID, "provider": provider}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Erreur serveur")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

// --- Facebook ---

func (d *Deps) facebookConfigured() bool {
	return d.Env.FacebookAppID != "" && d.Env.FacebookAppSecret != "" && d.Env.FacebookRedirectURL != ""
}

func (d *Deps) FacebookAuthorize(w http.ResponseWriter, r *http.Request) {
	if !d.facebookConfigured() {
		httpx.WriteError(w, http.StatusServiceUnavailable, "Le connecteur Facebook n'est pas configure")
		return
	}
	d.beginSocialOAuth(w, r, models.SocialProviderFacebook, func(state string) string {
		params := url.Values{}
		params.Set("client_id", d.Env.FacebookAppID)
		params.Set("redirect_uri", d.Env.FacebookRedirectURL)
		params.Set("state", state)
		params.Set("scope", "pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish")
		return "https://www.facebook.com/v21.0/dialog/oauth?" + params.Encode()
	})
}

type facebookTokenResponse struct {
	AccessToken string `json:"access_token"`
}

type facebookPage struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	AccessToken string `json:"access_token"`
}

func (d *Deps) FacebookCallback(w http.ResponseWriter, r *http.Request) {
	settingsURL := d.Env.AppURL + "/dashboard/settings"
	code := r.URL.Query().Get("code")
	userID, ok := consumeSocialState(r, models.SocialProviderFacebook)
	if code == "" || !ok {
		http.Redirect(w, r, settingsURL+"?facebook=error", http.StatusFound)
		return
	}

	tokenURL := "https://graph.facebook.com/v21.0/oauth/access_token?" + url.Values{
		"client_id":     {d.Env.FacebookAppID},
		"redirect_uri":  {d.Env.FacebookRedirectURL},
		"client_secret": {d.Env.FacebookAppSecret},
		"code":          {code},
	}.Encode()

	resp, err := http.Get(tokenURL)
	if err != nil {
		http.Redirect(w, r, settingsURL+"?facebook=error", http.StatusFound)
		return
	}
	defer resp.Body.Close()

	var token facebookTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil || token.AccessToken == "" {
		http.Redirect(w, r, settingsURL+"?facebook=error", http.StatusFound)
		return
	}

	// Posting requires a Page access token, not the user's own token - take
	// the first Page the user manages (no page-picker UI yet).
	pagesResp, err := http.Get("https://graph.facebook.com/v21.0/me/accounts?access_token=" + url.QueryEscape(token.AccessToken))
	if err != nil {
		http.Redirect(w, r, settingsURL+"?facebook=error", http.StatusFound)
		return
	}
	defer pagesResp.Body.Close()

	var pages struct {
		Data []facebookPage `json:"data"`
	}
	if err := json.NewDecoder(pagesResp.Body).Decode(&pages); err != nil || len(pages.Data) == 0 {
		http.Redirect(w, r, settingsURL+"?facebook=error", http.StatusFound)
		return
	}
	page := pages.Data[0]

	if err := upsertSocialConnection(r.Context(), userID, models.SocialProviderFacebook, page.ID, page.Name, token.AccessToken, page.AccessToken, ""); err != nil {
		http.Redirect(w, r, settingsURL+"?facebook=error", http.StatusFound)
		return
	}

	// Instagram publishing rides on the same Page connection - no separate
	// OAuth flow - so if this Page has a linked Instagram Business Account,
	// connect it automatically too.
	igResp, err := http.Get("https://graph.facebook.com/v21.0/" + page.ID +
		"?fields=instagram_business_account,name&access_token=" + url.QueryEscape(page.AccessToken))
	if err == nil {
		defer igResp.Body.Close()
		var igData struct {
			InstagramBusinessAccount struct {
				ID string `json:"id"`
			} `json:"instagram_business_account"`
		}
		if json.NewDecoder(igResp.Body).Decode(&igData) == nil && igData.InstagramBusinessAccount.ID != "" {
			_ = upsertSocialConnection(r.Context(), userID, models.SocialProviderInstagram,
				igData.InstagramBusinessAccount.ID, page.Name+" (Instagram)", token.AccessToken, page.AccessToken, "")
		}
	}

	http.Redirect(w, r, settingsURL+"?facebook=connected", http.StatusFound)
}

type facebookPublishRequest struct {
	Message string `json:"message"`
}

func (d *Deps) FacebookPublish(w http.ResponseWriter, r *http.Request) {
	var req facebookPublishRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || strings.TrimSpace(req.Message) == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	userID, ok := requireUserObjID(w, r)
	if !ok {
		return
	}

	var conn models.SocialConnection
	if err := db.Collection(models.SocialConnectionsCollection).FindOne(r.Context(),
		bson.M{"userId": userID, "provider": models.SocialProviderFacebook}).Decode(&conn); err != nil || conn.PageAccessToken == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Facebook n'est pas connecte")
		return
	}

	form := url.Values{"message": {req.Message}, "access_token": {conn.PageAccessToken}}
	resp, err := http.Post("https://graph.facebook.com/v21.0/"+conn.ExternalID+"/feed",
		"application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	if err != nil {
		httpx.WriteError(w, http.StatusBadGateway, "Facebook injoignable")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		httpx.WriteError(w, http.StatusBadGateway, "Echec de la publication Facebook")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

// --- YouTube (reuses the Gmail Google OAuth client) ---

func (d *Deps) youtubeConfigured() bool {
	return d.Env.GoogleOAuthClientID != "" && d.Env.GoogleOAuthClientSecret != "" && d.Env.YouTubeRedirectURL != ""
}

func (d *Deps) YouTubeAuthorize(w http.ResponseWriter, r *http.Request) {
	if !d.youtubeConfigured() {
		httpx.WriteError(w, http.StatusServiceUnavailable, "Le connecteur YouTube n'est pas configure")
		return
	}
	d.beginSocialOAuth(w, r, models.SocialProviderYouTube, func(state string) string {
		params := url.Values{}
		params.Set("client_id", d.Env.GoogleOAuthClientID)
		params.Set("redirect_uri", d.Env.YouTubeRedirectURL)
		params.Set("response_type", "code")
		// .upload (publier des videos) inclut la lecture necessaire pour
		// identifier la chaine - pas besoin de .readonly en plus.
		params.Set("scope", "https://www.googleapis.com/auth/youtube.upload")
		params.Set("access_type", "offline")
		params.Set("prompt", "consent")
		params.Set("state", state)
		return "https://accounts.google.com/o/oauth2/v2/auth?" + params.Encode()
	})
}

type youtubeChannelResponse struct {
	Items []struct {
		ID      string `json:"id"`
		Snippet struct {
			Title string `json:"title"`
		} `json:"snippet"`
	} `json:"items"`
}

func (d *Deps) YouTubeCallback(w http.ResponseWriter, r *http.Request) {
	settingsURL := d.Env.AppURL + "/dashboard/settings"
	code := r.URL.Query().Get("code")
	userID, ok := consumeSocialState(r, models.SocialProviderYouTube)
	if code == "" || !ok {
		http.Redirect(w, r, settingsURL+"?youtube=error", http.StatusFound)
		return
	}

	token, err := exchangeGoogleCode(d.Env.GoogleOAuthClientID, d.Env.GoogleOAuthClientSecret, d.Env.YouTubeRedirectURL, code)
	if err != nil {
		http.Redirect(w, r, settingsURL+"?youtube=error", http.StatusFound)
		return
	}

	req, _ := http.NewRequest("GET", "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", nil)
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Redirect(w, r, settingsURL+"?youtube=error", http.StatusFound)
		return
	}
	defer resp.Body.Close()

	var channels youtubeChannelResponse
	if err := json.NewDecoder(resp.Body).Decode(&channels); err != nil || len(channels.Items) == 0 {
		http.Redirect(w, r, settingsURL+"?youtube=error", http.StatusFound)
		return
	}
	channel := channels.Items[0]

	if err := upsertSocialConnection(r.Context(), userID, models.SocialProviderYouTube, channel.ID, channel.Snippet.Title, token.AccessToken, "", token.RefreshToken); err != nil {
		http.Redirect(w, r, settingsURL+"?youtube=error", http.StatusFound)
		return
	}

	http.Redirect(w, r, settingsURL+"?youtube=connected", http.StatusFound)
}

// --- TikTok (connect + identify only) ---

func (d *Deps) tiktokConfigured() bool {
	return d.Env.TikTokClientKey != "" && d.Env.TikTokClientSecret != "" && d.Env.TikTokRedirectURL != ""
}

func (d *Deps) TikTokAuthorize(w http.ResponseWriter, r *http.Request) {
	if !d.tiktokConfigured() {
		httpx.WriteError(w, http.StatusServiceUnavailable, "Le connecteur TikTok n'est pas configure")
		return
	}
	d.beginSocialOAuth(w, r, models.SocialProviderTikTok, func(state string) string {
		params := url.Values{}
		params.Set("client_key", d.Env.TikTokClientKey)
		params.Set("redirect_uri", d.Env.TikTokRedirectURL)
		params.Set("response_type", "code")
		params.Set("scope", "user.info.basic,video.publish")
		params.Set("state", state)
		return "https://www.tiktok.com/v2/auth/authorize?" + params.Encode()
	})
}

type tiktokTokenResponse struct {
	AccessToken string `json:"access_token"`
	OpenID      string `json:"open_id"`
}

type tiktokUserInfoResponse struct {
	Data struct {
		User struct {
			DisplayName string `json:"display_name"`
		} `json:"user"`
	} `json:"data"`
}

func (d *Deps) TikTokCallback(w http.ResponseWriter, r *http.Request) {
	settingsURL := d.Env.AppURL + "/dashboard/settings"
	code := r.URL.Query().Get("code")
	userID, ok := consumeSocialState(r, models.SocialProviderTikTok)
	if code == "" || !ok {
		http.Redirect(w, r, settingsURL+"?tiktok=error", http.StatusFound)
		return
	}

	form := url.Values{
		"client_key":    {d.Env.TikTokClientKey},
		"client_secret": {d.Env.TikTokClientSecret},
		"code":          {code},
		"grant_type":    {"authorization_code"},
		"redirect_uri":  {d.Env.TikTokRedirectURL},
	}
	resp, err := http.Post("https://open.tiktokapis.com/v2/oauth/token/", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	if err != nil {
		http.Redirect(w, r, settingsURL+"?tiktok=error", http.StatusFound)
		return
	}
	defer resp.Body.Close()

	var token tiktokTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil || token.AccessToken == "" {
		http.Redirect(w, r, settingsURL+"?tiktok=error", http.StatusFound)
		return
	}

	infoReq, _ := http.NewRequest("GET", "https://open.tiktokapis.com/v2/user/info/?fields=display_name", nil)
	infoReq.Header.Set("Authorization", "Bearer "+token.AccessToken)
	infoResp, err := http.DefaultClient.Do(infoReq)
	if err != nil {
		http.Redirect(w, r, settingsURL+"?tiktok=error", http.StatusFound)
		return
	}
	defer infoResp.Body.Close()

	var info tiktokUserInfoResponse
	_ = json.NewDecoder(infoResp.Body).Decode(&info)
	displayName := info.Data.User.DisplayName
	if displayName == "" {
		displayName = token.OpenID
	}

	if err := upsertSocialConnection(r.Context(), userID, models.SocialProviderTikTok, token.OpenID, displayName, token.AccessToken, "", ""); err != nil {
		http.Redirect(w, r, settingsURL+"?tiktok=error", http.StatusFound)
		return
	}

	http.Redirect(w, r, settingsURL+"?tiktok=connected", http.StatusFound)
}

// --- LinkedIn ---

func (d *Deps) linkedinConfigured() bool {
	return d.Env.LinkedInClientID != "" && d.Env.LinkedInClientSecret != "" && d.Env.LinkedInRedirectURL != ""
}

func (d *Deps) LinkedInAuthorize(w http.ResponseWriter, r *http.Request) {
	if !d.linkedinConfigured() {
		httpx.WriteError(w, http.StatusServiceUnavailable, "Le connecteur LinkedIn n'est pas configure")
		return
	}
	d.beginSocialOAuth(w, r, models.SocialProviderLinkedIn, func(state string) string {
		params := url.Values{}
		params.Set("client_id", d.Env.LinkedInClientID)
		params.Set("redirect_uri", d.Env.LinkedInRedirectURL)
		params.Set("response_type", "code")
		params.Set("scope", "openid profile w_member_social")
		params.Set("state", state)
		return "https://www.linkedin.com/oauth/v2/authorization?" + params.Encode()
	})
}

type linkedinTokenResponse struct {
	AccessToken string `json:"access_token"`
}

type linkedinUserInfoResponse struct {
	Sub  string `json:"sub"`
	Name string `json:"name"`
}

func (d *Deps) LinkedInCallback(w http.ResponseWriter, r *http.Request) {
	settingsURL := d.Env.AppURL + "/dashboard/settings"
	code := r.URL.Query().Get("code")
	userID, ok := consumeSocialState(r, models.SocialProviderLinkedIn)
	if code == "" || !ok {
		http.Redirect(w, r, settingsURL+"?linkedin=error", http.StatusFound)
		return
	}

	form := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {d.Env.LinkedInRedirectURL},
		"client_id":     {d.Env.LinkedInClientID},
		"client_secret": {d.Env.LinkedInClientSecret},
	}
	resp, err := http.Post("https://www.linkedin.com/oauth/v2/accessToken", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	if err != nil {
		http.Redirect(w, r, settingsURL+"?linkedin=error", http.StatusFound)
		return
	}
	defer resp.Body.Close()

	var token linkedinTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil || token.AccessToken == "" {
		http.Redirect(w, r, settingsURL+"?linkedin=error", http.StatusFound)
		return
	}

	infoReq, _ := http.NewRequest("GET", "https://api.linkedin.com/v2/userinfo", nil)
	infoReq.Header.Set("Authorization", "Bearer "+token.AccessToken)
	infoResp, err := http.DefaultClient.Do(infoReq)
	if err != nil {
		http.Redirect(w, r, settingsURL+"?linkedin=error", http.StatusFound)
		return
	}
	defer infoResp.Body.Close()

	var info linkedinUserInfoResponse
	if err := json.NewDecoder(infoResp.Body).Decode(&info); err != nil || info.Sub == "" {
		http.Redirect(w, r, settingsURL+"?linkedin=error", http.StatusFound)
		return
	}

	if err := upsertSocialConnection(r.Context(), userID, models.SocialProviderLinkedIn, info.Sub, info.Name, token.AccessToken, "", ""); err != nil {
		http.Redirect(w, r, settingsURL+"?linkedin=error", http.StatusFound)
		return
	}

	http.Redirect(w, r, settingsURL+"?linkedin=connected", http.StatusFound)
}
