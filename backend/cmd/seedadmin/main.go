// There is no public admin-registration endpoint on purpose — the first
// admin account is created from the VPS shell:
//
//	./seedadmin --email=you@mahu.app --password=secret --name="You"
package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"

	"mahu-backend/internal/config"
	"mahu-backend/internal/db"
	"mahu-backend/internal/models"
)

func parseArgs() map[string]string {
	args := map[string]string{}
	for _, arg := range os.Args[1:] {
		arg = strings.TrimPrefix(arg, "--")
		parts := strings.SplitN(arg, "=", 2)
		if len(parts) == 2 {
			args[parts[0]] = parts[1]
		}
	}
	return args
}

func main() {
	args := parseArgs()
	email, password, name := args["email"], args["password"], args["name"]
	if email == "" || password == "" || name == "" {
		fmt.Fprintln(os.Stderr, `Usage: seedadmin --email=you@mahu.app --password=secret --name="You"`)
		os.Exit(1)
	}

	env, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	if err := db.ConnectMongo(env.MongoURI); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	ctx := context.Background()
	col := db.Collection(models.AdminUsersCollection)

	var existing models.AdminUser
	err = col.FindOne(ctx, bson.M{"email": email}).Decode(&existing)
	if err == nil {
		fmt.Fprintf(os.Stderr, "Admin with email %s already exists.\n", email)
		os.Exit(1)
	}
	if err != mongo.ErrNoDocuments {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	now := time.Now()
	admin := models.AdminUser{
		ID:           primitive.NewObjectID(),
		Email:        email,
		PasswordHash: string(passwordHash),
		Name:         name,
		Role:         "superadmin",
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if _, err := col.InsertOne(ctx, admin); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	fmt.Printf("Admin account created for %s.\n", email)
	_ = db.Client.Disconnect(ctx)
}
