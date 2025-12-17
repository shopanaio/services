package main

import (
	"context"
	"database/sql"
	"log"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(Up0004, Down0004)
}

func Up0004(ctx context.Context, tx *sql.Tx) error {
	log.Println("Starting migration 0004: add price config columns to checkout_line_items")

	// Setting search path
	if _, err := tx.Exec(`SET search_path TO platform;`); err != nil {
		log.Println("Error setting search path")
		return err
	}

	// Add price_type column with check constraint
	priceTypeSQL := `
		ALTER TABLE platform.checkout_line_items
		ADD COLUMN price_type VARCHAR(20) CHECK (price_type IN (
			'FREE', 'BASE',
			'DISCOUNT_AMOUNT', 'DISCOUNT_PERCENT',
			'MARKUP_AMOUNT', 'MARKUP_PERCENT',
			'OVERRIDE'
		));
	`
	if _, err := tx.ExecContext(ctx, priceTypeSQL); err != nil {
		log.Printf("Error adding price_type column: %s", err)
		return err
	}

	// Add price_amount column (minor units, always positive)
	priceAmountSQL := `
		ALTER TABLE platform.checkout_line_items
		ADD COLUMN price_amount BIGINT CHECK (price_amount IS NULL OR price_amount >= 0);
	`
	if _, err := tx.ExecContext(ctx, priceAmountSQL); err != nil {
		log.Printf("Error adding price_amount column: %s", err)
		return err
	}

	// Add price_percent column (always positive, e.g., 10.00 for 10%)
	pricePercentSQL := `
		ALTER TABLE platform.checkout_line_items
		ADD COLUMN price_percent NUMERIC(5,2) CHECK (price_percent IS NULL OR price_percent >= 0);
	`
	if _, err := tx.ExecContext(ctx, pricePercentSQL); err != nil {
		log.Printf("Error adding price_percent column: %s", err)
		return err
	}

	// Add unit_original_price column (original price before adjustments)
	originalPriceSQL := `
		ALTER TABLE platform.checkout_line_items
		ADD COLUMN unit_original_price BIGINT CHECK (unit_original_price IS NULL OR unit_original_price >= 0);
	`
	if _, err := tx.ExecContext(ctx, originalPriceSQL); err != nil {
		log.Printf("Error adding unit_original_price column: %s", err)
		return err
	}

	// Backfill unit_original_price with unit_price for existing rows
	backfillSQL := `
		UPDATE platform.checkout_line_items
		SET unit_original_price = unit_price
		WHERE unit_original_price IS NULL AND unit_price IS NOT NULL;
	`
	if _, err := tx.ExecContext(ctx, backfillSQL); err != nil {
		log.Printf("Error backfilling unit_original_price: %s", err)
		return err
	}

	// Add comment explaining price calculation
	commentSQL := `
		COMMENT ON COLUMN platform.checkout_line_items.price_type IS
		'Price calculation:
		 FREE = 0,
		 BASE = unit_original_price,
		 DISCOUNT_AMOUNT = unit_original_price - price_amount,
		 DISCOUNT_PERCENT = unit_original_price * (100 - price_percent) / 100,
		 MARKUP_AMOUNT = unit_original_price + price_amount,
		 MARKUP_PERCENT = unit_original_price * (100 + price_percent) / 100,
		 OVERRIDE = price_amount';
	`
	if _, err := tx.ExecContext(ctx, commentSQL); err != nil {
		log.Printf("Error adding comment: %s", err)
		return err
	}

	// Restore search path
	if _, err := tx.Exec(`SET search_path TO public;`); err != nil {
		log.Println("Error restoring search path")
		return err
	}

	log.Println("Migration 0004 finished")
	return nil
}

func Down0004(ctx context.Context, tx *sql.Tx) error {
	log.Println("Rolling back migration 0004")

	// Setting search path
	if _, err := tx.Exec(`SET search_path TO platform;`); err != nil {
		log.Println("Error setting search path")
		return err
	}

	// Drop columns in reverse order
	if _, err := tx.ExecContext(ctx, `ALTER TABLE platform.checkout_line_items DROP COLUMN IF EXISTS unit_original_price;`); err != nil {
		log.Printf("Error dropping unit_original_price column: %s", err)
		return err
	}

	if _, err := tx.ExecContext(ctx, `ALTER TABLE platform.checkout_line_items DROP COLUMN IF EXISTS price_percent;`); err != nil {
		log.Printf("Error dropping price_percent column: %s", err)
		return err
	}

	if _, err := tx.ExecContext(ctx, `ALTER TABLE platform.checkout_line_items DROP COLUMN IF EXISTS price_amount;`); err != nil {
		log.Printf("Error dropping price_amount column: %s", err)
		return err
	}

	if _, err := tx.ExecContext(ctx, `ALTER TABLE platform.checkout_line_items DROP COLUMN IF EXISTS price_type;`); err != nil {
		log.Printf("Error dropping price_type column: %s", err)
		return err
	}

	// Restore search path
	if _, err := tx.Exec(`SET search_path TO public;`); err != nil {
		log.Println("Error restoring search path")
		return err
	}

	log.Println("Migration 0004 rollback finished")
	return nil
}
