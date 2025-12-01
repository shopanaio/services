package main

import (
	"context"
	"database/sql"
	"log"

	_ "embed"

	"github.com/pressly/goose/v3"
)

//go:embed sql-0003/features_v2.sql
var featuresV2 string

//go:embed sql-0003/_rollback.sql
var rollback0003 string

func init() {
	goose.AddMigrationContext(Up0003, Down0003)
}

func Up0003(ctx context.Context, tx *sql.Tx) error {
	log.Println("Starting migration 0003: add product features v2 tables")

	// Setting search path
	if _, err := tx.Exec(`SET search_path TO platform;`); err != nil {
		log.Println("Error setting search path")
		return err
	}

	// Execute features v2 schema
	if _, err := tx.ExecContext(ctx, featuresV2); err != nil {
		log.Printf("Error executing features v2 migration: %s", err)
		return err
	}

	// Restore search path
	if _, err := tx.Exec(`SET search_path TO public;`); err != nil {
		log.Println("Error restoring search path")
		return err
	}

	log.Println("Migration 0003 finished")
	return nil
}

func Down0003(ctx context.Context, tx *sql.Tx) error {
	log.Println("Rolling back migration 0003")

	// Setting search path
	if _, err := tx.Exec(`SET search_path TO platform;`); err != nil {
		log.Println("Error setting search path")
		return err
	}

	// Execute rollback
	if _, err := tx.ExecContext(ctx, rollback0003); err != nil {
		log.Printf("Error executing rollback: %s", err)
		return err
	}

	// Restore search path
	if _, err := tx.Exec(`SET search_path TO public;`); err != nil {
		log.Println("Error restoring search path")
		return err
	}

	log.Println("Migration 0003 rollback finished")
	return nil
}
