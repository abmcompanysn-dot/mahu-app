package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const MyFocusDevicesCollection = "myfocus_devices"

// MyFocusDevice is a phone running the MyFocus Android app. The app signs
// every alert with Secret (HMAC-SHA256), and alerts are only emailed once
// Email has been verified with the code sent at registration - so the
// public alert endpoint can't be used to send mail to arbitrary people.
type MyFocusDevice struct {
	ID            primitive.ObjectID `bson:"_id,omitempty"`
	DeviceID      string             `bson:"deviceId"`
	Secret        string             `bson:"secret"`
	Email         string             `bson:"email"`
	DeviceName    string             `bson:"deviceName"`
	Verified      bool               `bson:"verified"`
	VerifyCode    string             `bson:"verifyCode,omitempty"`
	CodeExpiresAt *time.Time         `bson:"codeExpiresAt,omitempty"`
	CodeAttempts  int                `bson:"codeAttempts"`
	AlertCount    int                `bson:"alertCount"`
	LastAlertAt   *time.Time         `bson:"lastAlertAt,omitempty"`
	LastEmailAt   *time.Time         `bson:"lastEmailAt,omitempty"`
	CreatedAt     time.Time          `bson:"createdAt"`
}
