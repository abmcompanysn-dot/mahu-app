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
