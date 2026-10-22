// Package kube is a minimal Kubernetes API client using the pod's own service
// account (in-cluster). The backend only uses it to manage Cloud PC desktops
// in the mahu-pc namespace - its Role there is all it can touch (see
// k8s/20-cloudpc.yaml).
package kube

import (
	"bytes"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const saDir = "/var/run/secrets/kubernetes.io/serviceaccount"

// ErrNotFound is returned by Get when the object does not exist.
var ErrNotFound = errors.New("kube: not found")

type Client struct {
	base   string
	token  string
	client *http.Client
}

// InCluster builds a client from the mounted service account. It fails
// outside the cluster (local dev), which callers report as "Cloud PC
// indisponible".
func InCluster() (*Client, error) {
	host, port := os.Getenv("KUBERNETES_SERVICE_HOST"), os.Getenv("KUBERNETES_SERVICE_PORT")
	if host == "" || port == "" {
		return nil, errors.New("kube: not running in a cluster")
	}
	token, err := os.ReadFile(saDir + "/token")
	if err != nil {
		return nil, fmt.Errorf("kube: token: %w", err)
	}
	ca, err := os.ReadFile(saDir + "/ca.crt")
	if err != nil {
		return nil, fmt.Errorf("kube: ca: %w", err)
	}
	pool := x509.NewCertPool()
	pool.AppendCertsFromPEM(ca)
	return &Client{
		base:  "https://" + host + ":" + port,
		token: strings.TrimSpace(string(token)),
		client: &http.Client{Timeout: 20 * time.Second,
			Transport: &http.Transport{TLSClientConfig: &tls.Config{RootCAs: pool}}},
	}, nil
}

func (c *Client) do(method, path, contentType string, body any, out any) (int, error) {
	var rd io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return 0, err
		}
		rd = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, c.base+path, rd)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", contentType)
	}
	resp, err := c.client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 300 {
		return resp.StatusCode, fmt.Errorf("kube %s %s: %d %s", method, path, resp.StatusCode, strings.TrimSpace(string(data[:min(len(data), 300)])))
	}
	if out != nil && len(data) > 0 {
		return resp.StatusCode, json.Unmarshal(data, out)
	}
	return resp.StatusCode, nil
}

// Create posts obj to path; an object that already exists is not an error.
func (c *Client) Create(path string, obj any) error {
	code, err := c.do(http.MethodPost, path, "application/json", obj, nil)
	if code == http.StatusConflict {
		return nil
	}
	return err
}

// Patch applies a JSON merge patch.
func (c *Client) Patch(path string, patch any) error {
	_, err := c.do(http.MethodPatch, path, "application/merge-patch+json", patch, nil)
	return err
}

// Get decodes the object at path into out.
func (c *Client) Get(path string, out any) error {
	code, err := c.do(http.MethodGet, path, "", nil, out)
	if code == http.StatusNotFound {
		return ErrNotFound
	}
	return err
}

// Delete removes the object at path; a missing object is not an error.
func (c *Client) Delete(path string) error {
	code, err := c.do(http.MethodDelete, path, "", nil, nil)
	if code == http.StatusNotFound {
		return nil
	}
	return err
}
