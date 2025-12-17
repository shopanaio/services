package main

import (
	"context"
	"database/sql"
	"log"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(Up0002, Down0002)
}

func Up0002(ctx context.Context, tx *sql.Tx) error {
	log.Println("Starting migration 0002: add parent_line_item_id to checkout_line_items")

	// Setting search path
	if _, err := tx.Exec(`SET search_path TO platform;`); err != nil {
		log.Println("Error setting search path")
		return err
	}

	// Add parent_line_item_id column
	alterSQL := `
		ALTER TABLE platform.checkout_line_items
		ADD COLUMN parent_line_item_id uuid NULL;
	`
	if _, err := tx.ExecContext(ctx, alterSQL); err != nil {
		log.Printf("Error adding parent_line_item_id column: %s", err)
		return err
	}

	// Add foreign key constraint
	fkSQL := `
		ALTER TABLE platform.checkout_line_items
		ADD CONSTRAINT fk_cli_parent
		FOREIGN KEY (parent_line_item_id)
		REFERENCES platform.checkout_line_items (id)
		ON DELETE CASCADE;
	`
	if _, err := tx.ExecContext(ctx, fkSQL); err != nil {
		log.Printf("Error adding FK constraint: %s", err)
		return err
	}

	// Add index for efficient parent lookup
	indexSQL := `
		CREATE INDEX IF NOT EXISTS idx_cli_parent
		ON platform.checkout_line_items (checkout_id, parent_line_item_id);
	`
	if _, err := tx.ExecContext(ctx, indexSQL); err != nil {
		log.Printf("Error adding index: %s", err)
		return err
	}

	// Restore search path
	if _, err := tx.Exec(`SET search_path TO public;`); err != nil {
		log.Println("Error restoring search path")
		return err
	}

	log.Println("Migration 0002 finished")
	return nil
}

func Down0002(ctx context.Context, tx *sql.Tx) error {
	log.Println("Rolling back migration 0002")

	// Setting search path
	if _, err := tx.Exec(`SET search_path TO platform;`); err != nil {
		log.Println("Error setting search path")
		return err
	}

	// Drop index
	if _, err := tx.ExecContext(ctx, `DROP INDEX IF EXISTS platform.idx_cli_parent;`); err != nil {
		log.Printf("Error dropping index: %s", err)
		return err
	}

	// Drop foreign key constraint
	if _, err := tx.ExecContext(ctx, `ALTER TABLE platform.checkout_line_items DROP CONSTRAINT IF EXISTS fk_cli_parent;`); err != nil {
		log.Printf("Error dropping FK constraint: %s", err)
		return err
	}

	// Drop column
	if _, err := tx.ExecContext(ctx, `ALTER TABLE platform.checkout_line_items DROP COLUMN IF EXISTS parent_line_item_id;`); err != nil {
		log.Printf("Error dropping parent_line_item_id column: %s", err)
		return err
	}

	// Restore search path
	if _, err := tx.Exec(`SET search_path TO public;`); err != nil {
		log.Println("Error restoring search path")
		return err
	}

	log.Println("Migration 0002 rollback finished")
	return nil
}
