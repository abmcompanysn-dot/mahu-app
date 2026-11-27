package cloudinaryutil

import (
	"bytes"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"mahu-backend/internal/config"
)

// Signed dit si les envois Cloudinary sont signes (cle API + secret configures).
func Signed(env *config.Env) bool {
	return env.CloudinaryAPIKey != "" && env.CloudinaryAPISecret != ""
}

// Sign calcule la signature Cloudinary : parametres tries par nom, joints en
// « a=1&b=2 », suivis du secret API, puis SHA-1 en hexadecimal.
func Sign(params map[string]string, apiSecret string) string {
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	parts := make([]string, len(keys))
	for i, k := range keys {
		parts[i] = k + "=" + params[k]
	}
	sum := sha1.Sum([]byte(strings.Join(parts, "&") + apiSecret))
	return hex.EncodeToString(sum[:])
}

// UploadParams : champs a envoyer avec le fichier (preset, et signature si configuree).
func UploadParams(env *config.Env) map[string]string {
	params := map[string]string{"upload_preset": env.CloudinaryUploadPreset}
	if !Signed(env) {
		return params
	}
	params["timestamp"] = strconv.FormatInt(time.Now().Unix(), 10)
	params["signature"] = Sign(params, env.CloudinaryAPISecret)
	params["api_key"] = env.CloudinaryAPIKey
	return params
}

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
	for k, v := range UploadParams(env) {
		if err := writer.WriteField(k, v); err != nil {
			return "", err
		}
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
	for k, v := range UploadParams(env) {
		if err := writer.WriteField(k, v); err != nil {
			return "", "", err
		}
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
