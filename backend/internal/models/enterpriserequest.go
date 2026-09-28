package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const EnterpriseRequestsCollection = "enterprise_requests"

const (
	EnterpriseRequestNew     = "nouveau"
	EnterpriseRequestHandled = "traite"
)

// EnterpriseRequest is a quote request from the dashboard's Entreprise page.
// The enterprise offer is a custom system installed on the company's own
// infrastructure (its data isn't managed by Mahu), so there is no self-serve
// plan - every request is followed up by hand.
type EnterpriseRequest struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Company       string             `bson:"company" json:"company"`
	ContactName   string             `bson:"contactName" json:"contactName"`
	Email         string             `bson:"email" json:"email"`
	Phone         string             `bson:"phone" json:"phone"`
	EmployeeCount string             `bson:"employeeCount" json:"employeeCount"`
	Message       string             `bson:"message" json:"message"`
	Status        string             `bson:"status" json:"status"`
	CreatedAt     time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt     time.Time          `bson:"updatedAt" json:"updatedAt"`
}
