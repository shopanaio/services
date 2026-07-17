-- Up Migration

-- Reservations prevent concurrent checkouts from oversubscribing a finite
-- discount. Expired/released rows remain as an operational audit trail.
CREATE TABLE "pricing"."discount_usage_reservation" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "discount_id" uuid NOT NULL,
  "code_id" uuid,
  "customer_id" uuid,
  "checkout_id" uuid NOT NULL,
  "idempotency_key" text NOT NULL,
  "status" "pricing"."discount_reservation_status" NOT NULL DEFAULT 'ACTIVE',
  "expires_at" timestamptz NOT NULL,
  "committed_at" timestamptz,
  "closed_at" timestamptz,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "discount_usage_reservation_discount_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount" ("id")
    ON DELETE RESTRICT,
  CONSTRAINT "discount_usage_reservation_code_fk"
    FOREIGN KEY ("discount_id", "code_id")
    REFERENCES "pricing"."discount_code" ("discount_id", "id")
    ON DELETE RESTRICT,
  CONSTRAINT "discount_usage_reservation_store_id_unique"
    UNIQUE ("store_id", "id"),
  CONSTRAINT "discount_usage_reservation_store_discount_id_unique"
    UNIQUE ("store_id", "discount_id", "id"),
  CONSTRAINT "discount_usage_reservation_discount_id_id_unique"
    UNIQUE ("discount_id", "id"),
  CONSTRAINT "discount_usage_reservation_idempotency_unique"
    UNIQUE ("store_id", "idempotency_key"),
  CONSTRAINT "discount_usage_reservation_idempotency_check"
    CHECK (length(btrim("idempotency_key")) > 0),
  CONSTRAINT "discount_usage_reservation_expiry_check"
    CHECK ("expires_at" > "created_at"),
  CONSTRAINT "discount_usage_reservation_status_check"
    CHECK (
      (
        "status" = 'ACTIVE'
        AND "committed_at" IS NULL
        AND "closed_at" IS NULL
      )
      OR (
        "status" = 'COMMITTED'
        AND "committed_at" IS NOT NULL
        AND "closed_at" IS NULL
      )
      OR (
        "status" IN ('RELEASED', 'EXPIRED')
        AND "committed_at" IS NULL
        AND "closed_at" IS NOT NULL
      )
    ),
  CONSTRAINT "discount_usage_reservation_metadata_object_check"
    CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE UNIQUE INDEX "discount_usage_reservation_active_checkout_unique"
  ON "pricing"."discount_usage_reservation" (
    "store_id",
    "discount_id",
    "checkout_id"
  )
  WHERE "status" = 'ACTIVE';

CREATE INDEX "discount_usage_reservation_expiry_queue_idx"
  ON "pricing"."discount_usage_reservation" ("expires_at", "id")
  WHERE "status" = 'ACTIVE';

CREATE INDEX "discount_usage_reservation_store_checkout_idx"
  ON "pricing"."discount_usage_reservation" (
    "store_id",
    "checkout_id",
    "created_at" DESC,
    "id"
  );

CREATE INDEX "discount_usage_reservation_store_customer_idx"
  ON "pricing"."discount_usage_reservation" (
    "store_id",
    "customer_id",
    "created_at" DESC,
    "id"
  )
  WHERE "customer_id" IS NOT NULL;
