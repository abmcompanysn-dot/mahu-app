package legacyauth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"strings"
)

// NewUUID generates a standard v4 UUID string, matching the format
// Apps Script's Utilities.getUuid() produced (used as both record IDs and
// password salts in the previous system).
func NewUUID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant 10
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16]), nil
}

func digest(salt, password string) string {
	sum := sha256.Sum256([]byte(salt + password))
	return base64.StdEncoding.EncodeToString(sum[:])
}

// HashPassword reproduces the previous format exactly: salt (a UUID) + "$" +
// base64(SHA-256(salt+password)) - see registerUser/resetPassword in Code.gs.
func HashPassword(password string) (string, error) {
	salt, err := NewUUID()
	if err != nil {
		return "", err
	}
	return salt + "$" + digest(salt, password), nil
}

// VerifyPassword checks a password against the stored value, supporting both
// the salted format and the legacy plaintext format still used by any
// account that never logged in since the hash upgrade shipped. When a
// plaintext match is found, upgraded is true and newStored holds the salted
// replacement the caller should persist immediately (auto-upgrade-on-login,
// same behaviour as the previous loginUser()).
func VerifyPassword(stored, password string) (valid bool, upgraded bool, newStored string) {
	if strings.Contains(stored, "$") {
		parts := strings.SplitN(stored, "$", 2)
		salt, hash := parts[0], parts[1]
		return digest(salt, password) == hash, false, ""
	}

	if stored == password {
		if newHash, err := HashPassword(password); err == nil {
			return true, true, newHash
		}
		return true, false, ""
	}

	return false, false, ""
}
