package cloudinaryutil

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"

	"mahu-backend/internal/config"
)

type uploadResponse struct {
	SecureURL string `json:"secure_url"`
	PublicID  string `json:"public_id"`
	Error     struct {
		Message string `json:"message"`
	} `json:"error"`
}

// UploadBase64 uploads a data: URI (or raw base64 string) to Cloudinary using
// the same unsigned upload preset the frontend already uses client-side (see
// lib/cloudinary.ts) - no API secret needed. Replaces the previous
// uploadImageToDrive() which stored images on Google Drive.
func UploadBase64(env *config.Env, base64Data string) (string, error) {
	url := fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/image/upload", env.CloudinaryCloudName)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if err := writer.WriteField("file", base64Data); err != nil {
		return "", err
	}
	if err := writer.WriteField("upload_preset", env.CloudinaryUploadPreset); err != nil {
		return "", err
	}
	if err := writer.Close(); err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", url, &body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var result uploadResponse
	if err := json.Unmarshal(raw, &result); err != nil {
		return "", err
	}
	if result.SecureURL == "" {
		if result.Error.Message != "" {
			return "", fmt.Errorf("cloudinary: %s", result.Error.Message)
		}
		return "", fmt.Errorf("cloudinary: no secure_url in response")
	}

	return result.SecureURL, nil
}

// UploadVideo uploads a video or audio asset to Cloudinary's video resource
// type (Cloudinary treats standalone audio as a video sub-resource) - "file"
// can be a remote http(s) URL or a data: URI, both accepted by the unsigned
// upload preset the same way the browser client already uploads videos (see
// lib/cloudinary.ts). Returns the public_id alongside the secure_url because
// the audio-overlay transformation (see MergeVideoNarration) addresses
// assets by public_id, not by URL.
func UploadVideo(env *config.Env, file string) (secureURL string, publicID string, err error) {
	url := fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/video/upload", env.CloudinaryCloudName)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if err := writer.WriteField("file", file); err != nil {
		return "", "", err
	}
	if err := writer.WriteField("upload_preset", env.CloudinaryUploadPreset); err != nil {
		return "", "", err
	}
	if err := writer.Close(); err != nil {
		return "", "", err
	}

	req, err := http.NewRequest("POST", url, &body)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", err
	}

	var result uploadResponse
	if err := json.Unmarshal(raw, &result); err != nil {
		return "", "", err
	}
	if result.SecureURL == "" {
		if result.Error.Message != "" {
			return "", "", fmt.Errorf("cloudinary: %s", result.Error.Message)
		}
		return "", "", fmt.Errorf("cloudinary: no secure_url in response")
	}

	return result.SecureURL, result.PublicID, nil
}
