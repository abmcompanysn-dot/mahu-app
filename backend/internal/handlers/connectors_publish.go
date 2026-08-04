package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"net/url"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"mahu-backend/internal/db"
	"mahu-backend/internal/httpx"
	"mahu-backend/internal/models"
)

// PublishVideo - NEW, UNVERIFIED - fans a single already-hosted video out to
// every connected platform the caller asked for. The video itself is
// expected to already be hosted somewhere public (Cloudinary, same as
// existing image uploads) - this endpoint never buffers the whole file into
// memory itself; Facebook and TikTok fetch the URL server-side, and the
// YouTube upload streams the source bytes straight through rather than
// loading them fully first.
//
// YouTube videos are uploaded as "private" by default (see privacyStatus
// below) - deliberately conservative until you've verified this actually
// works end to end. TikTok videos are posted as SELF_ONLY: an unaudited
// TikTok app is restricted to private posts by TikTok itself regardless of
// what this code requests, so asking for public here would just fail.

type publishVideoRequest struct {
	VideoURL  string   `json:"videoUrl"`
	Title     string   `json:"title"`
	Caption   string   `json:"caption"`
	Platforms []string `json:"platforms"`
}

type publishResult struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

func (d *Deps) PublishVideo(w http.ResponseWriter, r *http.Request) {
	var req publishVideoRequest
	if err := httpx.DecodeJSON(r, &req); err != nil || req.VideoURL == "" || len(req.Platforms) == 0 {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	userID, ok := requireUserObjID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()

	results := map[string]publishResult{}

	for _, platform := range req.Platforms {
		var conn models.SocialConnection
		err := db.Collection(models.SocialConnectionsCollection).FindOne(ctx,
			bson.M{"userId": userID, "provider": platform}).Decode(&conn)
		if err != nil {
			results[platform] = publishResult{Success: false, Error: "non connecte"}
			continue
		}

		switch platform {
		case models.SocialProviderFacebook:
			results[platform] = d.publishToFacebookVideo(conn, req)
		case models.SocialProviderInstagram:
			results[platform] = d.publishToInstagramVideo(conn, req)
		case models.SocialProviderTikTok:
			results[platform] = d.publishToTikTokVideo(conn, req)
		case models.SocialProviderYouTube:
			results[platform] = d.publishToYouTubeVideo(conn, req)
		case models.SocialProviderLinkedIn:
			results[platform] = d.publishToLinkedInVideo(conn, req)
		default:
			results[platform] = publishResult{Success: false, Error: "plateforme inconnue"}
		}
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"results": results})
}

func (d *Deps) publishToFacebookVideo(conn models.SocialConnection, req publishVideoRequest) publishResult {
	if conn.PageAccessToken == "" {
		return publishResult{Success: false, Error: "non connecte"}
	}
	form := url.Values{
		"file_url":     {req.VideoURL},
		"description":  {req.Caption},
		"access_token": {conn.PageAccessToken},
	}
	resp, err := http.Post("https://graph.facebook.com/v21.0/"+conn.ExternalID+"/videos",
		"application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	if err != nil {
		return publishResult{Success: false, Error: "Facebook injoignable"}
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 500))
		return publishResult{Success: false, Error: "echec Facebook: " + string(body)}
	}
	return publishResult{Success: true}
}

func (d *Deps) publishToTikTokVideo(conn models.SocialConnection, req publishVideoRequest) publishResult {
	if conn.AccessToken == "" {
		return publishResult{Success: false, Error: "non connecte"}
	}
	payload := map[string]any{
		"post_info": map[string]any{
			"title": req.Title,
			// Un-audited TikTok apps can only post privately regardless of
			// what's requested here - see the note at the top of this file.
			"privacy_level": "SELF_ONLY",
		},
		"source_info": map[string]any{
			"source":    "PULL_FROM_URL",
			"video_url": req.VideoURL,
		},
	}
	body, _ := json.Marshal(payload)
	tiktokReq, _ := http.NewRequest("POST", "https://open.tiktokapis.com/v2/post/publish/video/init/", bytes.NewReader(body))
	tiktokReq.Header.Set("Content-Type", "application/json")
	tiktokReq.Header.Set("Authorization", "Bearer "+conn.AccessToken)

	resp, err := http.DefaultClient.Do(tiktokReq)
	if err != nil {
		return publishResult{Success: false, Error: "TikTok injoignable"}
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 500))
		return publishResult{Success: false, Error: "echec TikTok: " + string(respBody)}
	}
	return publishResult{Success: true}
}

func (d *Deps) publishToYouTubeVideo(conn models.SocialConnection, req publishVideoRequest) publishResult {
	if conn.RefreshToken == "" {
		return publishResult{Success: false, Error: "non connecte"}
	}
	accessToken, err := refreshGoogleAccessToken(d.Env.GoogleOAuthClientID, d.Env.GoogleOAuthClientSecret, conn.RefreshToken)
	if err != nil {
		return publishResult{Success: false, Error: "acces YouTube expire - reconnecte ton compte"}
	}

	videoResp, err := http.Get(req.VideoURL)
	if err != nil {
		return publishResult{Success: false, Error: "video source injoignable"}
	}
	defer videoResp.Body.Close()
	if videoResp.StatusCode < 200 || videoResp.StatusCode >= 300 {
		return publishResult{Success: false, Error: "video source injoignable"}
	}

	pr, pw := io.Pipe()
	writer := multipart.NewWriter(pw)

	go func() {
		defer pw.Close()
		defer writer.Close()

		metaPart, err := writer.CreatePart(textproto.MIMEHeader{"Content-Type": {"application/json; charset=UTF-8"}})
		if err != nil {
			pw.CloseWithError(err)
			return
		}
		meta := map[string]any{
			"snippet": map[string]any{"title": req.Title, "description": req.Caption},
			// Prive par defaut - change manuellement sur YouTube Studio une
			// fois que tu as verifie que l'upload fonctionne comme attendu.
			"status": map[string]any{"privacyStatus": "private"},
		}
		if err := json.NewEncoder(metaPart).Encode(meta); err != nil {
			pw.CloseWithError(err)
			return
		}

		videoPart, err := writer.CreatePart(textproto.MIMEHeader{"Content-Type": {"video/*"}})
		if err != nil {
			pw.CloseWithError(err)
			return
		}
		if _, err := io.Copy(videoPart, videoResp.Body); err != nil {
			pw.CloseWithError(err)
			return
		}
	}()

	uploadReq, err := http.NewRequest("POST",
		"https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart", pr)
	if err != nil {
		return publishResult{Success: false, Error: "erreur interne"}
	}
	uploadReq.Header.Set("Content-Type", fmt.Sprintf("multipart/related; boundary=%s", writer.Boundary()))
	uploadReq.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(uploadReq)
	if err != nil {
		return publishResult{Success: false, Error: "YouTube injoignable"}
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 500))
		return publishResult{Success: false, Error: "echec YouTube: " + string(respBody)}
	}
	return publishResult{Success: true}
}

// publishToInstagramVideo rides on the Facebook Page connection (conn.ExternalID
// is the Instagram Business Account ID, conn.PageAccessToken the Page token -
// both captured automatically in FacebookCallback). Instagram's Graph API
// posting is a two-step container-then-publish flow: create a media
// container (Instagram fetches the video itself from video_url, same as
// Facebook's /videos), wait for it to finish processing, then publish it.
func (d *Deps) publishToInstagramVideo(conn models.SocialConnection, req publishVideoRequest) publishResult {
	if conn.PageAccessToken == "" {
		return publishResult{Success: false, Error: "non connecte"}
	}

	createForm := url.Values{
		"media_type":   {"REELS"},
		"video_url":    {req.VideoURL},
		"caption":      {req.Caption},
		"access_token": {conn.PageAccessToken},
	}
	createResp, err := http.Post("https://graph.facebook.com/v21.0/"+conn.ExternalID+"/media",
		"application/x-www-form-urlencoded", strings.NewReader(createForm.Encode()))
	if err != nil {
		return publishResult{Success: false, Error: "Instagram injoignable"}
	}
	defer createResp.Body.Close()

	var container struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(createResp.Body).Decode(&container); err != nil || container.ID == "" {
		return publishResult{Success: false, Error: "echec de la creation du conteneur Instagram"}
	}

	// Best-effort wait for processing - Instagram fetches and transcodes the
	// video asynchronously, publishing too early fails with "media not ready".
	statusURL := "https://graph.facebook.com/v21.0/" + container.ID + "?fields=status_code&access_token=" + url.QueryEscape(conn.PageAccessToken)
	for i := 0; i < 5; i++ {
		time.Sleep(3 * time.Second)
		statusResp, err := http.Get(statusURL)
		if err != nil {
			continue
		}
		var status struct {
			StatusCode string `json:"status_code"`
		}
		_ = json.NewDecoder(statusResp.Body).Decode(&status)
		statusResp.Body.Close()
		if status.StatusCode == "FINISHED" {
			break
		}
	}

	publishForm := url.Values{"creation_id": {container.ID}, "access_token": {conn.PageAccessToken}}
	publishResp, err := http.Post("https://graph.facebook.com/v21.0/"+conn.ExternalID+"/media_publish",
		"application/x-www-form-urlencoded", strings.NewReader(publishForm.Encode()))
	if err != nil {
		return publishResult{Success: false, Error: "Instagram injoignable"}
	}
	defer publishResp.Body.Close()
	if publishResp.StatusCode < 200 || publishResp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(publishResp.Body, 500))
		return publishResult{Success: false, Error: "echec Instagram: " + string(body)}
	}
	return publishResult{Success: true}
}

type linkedinAssetResponse struct {
	Value struct {
		Asset           string `json:"asset"`
		UploadMechanism struct {
			MediaUploadHTTPRequest struct {
				UploadURL string `json:"uploadUrl"`
			} `json:"com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"`
		} `json:"uploadMechanism"`
	} `json:"value"`
}

func (d *Deps) publishToLinkedInVideo(conn models.SocialConnection, req publishVideoRequest) publishResult {
	if conn.AccessToken == "" {
		return publishResult{Success: false, Error: "non connecte"}
	}
	authorURN := "urn:li:person:" + conn.ExternalID

	registerPayload, _ := json.Marshal(map[string]any{
		"registerUploadRequest": map[string]any{
			"recipes": []string{"urn:li:digitalmediaRecipe:feedshare-video"},
			"owner":   authorURN,
			"serviceRelationships": []map[string]string{
				{"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"},
			},
		},
	})
	registerReq, _ := http.NewRequest("POST", "https://api.linkedin.com/v2/assets?action=registerUpload", bytes.NewReader(registerPayload))
	registerReq.Header.Set("Content-Type", "application/json")
	registerReq.Header.Set("Authorization", "Bearer "+conn.AccessToken)

	registerResp, err := http.DefaultClient.Do(registerReq)
	if err != nil {
		return publishResult{Success: false, Error: "LinkedIn injoignable"}
	}
	defer registerResp.Body.Close()

	var asset linkedinAssetResponse
	if err := json.NewDecoder(registerResp.Body).Decode(&asset); err != nil || asset.Value.Asset == "" {
		return publishResult{Success: false, Error: "echec d'enregistrement de l'upload LinkedIn"}
	}
	uploadURL := asset.Value.UploadMechanism.MediaUploadHTTPRequest.UploadURL
	if uploadURL == "" {
		return publishResult{Success: false, Error: "echec d'enregistrement de l'upload LinkedIn"}
	}

	videoResp, err := http.Get(req.VideoURL)
	if err != nil {
		return publishResult{Success: false, Error: "video source injoignable"}
	}
	defer videoResp.Body.Close()

	uploadReq, err := http.NewRequest("PUT", uploadURL, videoResp.Body)
	if err != nil {
		return publishResult{Success: false, Error: "erreur interne"}
	}
	uploadReq.Header.Set("Authorization", "Bearer "+conn.AccessToken)
	uploadReq.ContentLength = videoResp.ContentLength

	uploadResp, err := http.DefaultClient.Do(uploadReq)
	if err != nil {
		return publishResult{Success: false, Error: "upload LinkedIn injoignable"}
	}
	defer uploadResp.Body.Close()
	if uploadResp.StatusCode < 200 || uploadResp.StatusCode >= 300 {
		return publishResult{Success: false, Error: "echec de l'upload video LinkedIn"}
	}

	postPayload, _ := json.Marshal(map[string]any{
		"author":         authorURN,
		"lifecycleState": "PUBLISHED",
		"specificContent": map[string]any{
			"com.linkedin.ugc.ShareContent": map[string]any{
				"shareCommentary":    map[string]string{"text": req.Caption},
				"shareMediaCategory": "VIDEO",
				"media": []map[string]any{
					{"status": "READY", "media": asset.Value.Asset, "title": map[string]string{"text": req.Title}},
				},
			},
		},
		"visibility": map[string]string{"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
	})
	postReq, _ := http.NewRequest("POST", "https://api.linkedin.com/v2/ugcPosts", bytes.NewReader(postPayload))
	postReq.Header.Set("Content-Type", "application/json")
	postReq.Header.Set("Authorization", "Bearer "+conn.AccessToken)
	postReq.Header.Set("X-Restli-Protocol-Version", "2.0.0")

	postResp, err := http.DefaultClient.Do(postReq)
	if err != nil {
		return publishResult{Success: false, Error: "LinkedIn injoignable"}
	}
	defer postResp.Body.Close()
	if postResp.StatusCode < 200 || postResp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(postResp.Body, 500))
		return publishResult{Success: false, Error: "echec LinkedIn: " + string(body)}
	}
	return publishResult{Success: true}
}
