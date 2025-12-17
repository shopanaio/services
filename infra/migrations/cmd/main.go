package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/pressly/goose/v3"

	"github.com/jmoiron/sqlx"

	_ "github.com/lib/pq"
)

func main() {
	DB_HOST := os.Getenv("PLATFORM_DB_HOST")
	DB_NAME := os.Getenv("PLATFORM_DB_NAME")
	DB_USER := os.Getenv("PLATFORM_DB_USER")
	DB_PASSWORD := os.Getenv("PLATFORM_DB_PASSWORD")
	DB_SSL := os.Getenv("PLATFORM_DB_SSL")
	DB_PORT := os.Getenv("PLATFORM_DB_PORT")

	DSN := fmt.Sprintf(
		"host=%s dbname=%s user=%s password=%s sslmode=%s",
		DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL,
	)

	if DB_PORT != "" {
		DSN = fmt.Sprintf("%s port=%s", DSN, DB_PORT)
	}

	db, err := sqlx.Connect("postgres", DSN)
	if err != nil {
		panic(fmt.Sprintf("connection error: %s\n\n%s", DSN, err.Error()))
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		panic(err.Error())
	}

	if err := goose.UpContext(context.Background(), db.DB, "/app/sql"); err != nil {
		fmt.Println("Migration failed: ", err)
		panic(err)
	}

	fmt.Println("Successfully migrated database")
	os.Exit(0)
}
