-- Up Migration

-- Customer IDs are owned by the customers service; no cross-service FK.
CREATE TABLE "pricing"."discount_eligible_customer" (
  "store_id" uuid NOT NULL,
  "discount_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "reference_status" "pricing"."reference_status" NOT NULL DEFAULT 'VALID',
  "reference_status_changed_at" timestamptz,
  "reference_checked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "discount_eligible_customer_pkey"
    PRIMARY KEY ("discount_id", "customer_id"),
  CONSTRAINT "discount_eligible_customer_context_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount_buyer_context" ("discount_id")
    ON DELETE CASCADE,
  CONSTRAINT "discount_eligible_customer_reference_status_check"
    CHECK (
      "reference_status" = 'VALID'
      OR "reference_status_changed_at" IS NOT NULL
    )
);

CREATE INDEX "discount_eligible_customer_store_lookup_idx"
  ON "pricing"."discount_eligible_customer" (
    "store_id",
    "customer_id",
    "discount_id"
  );

CREATE INDEX "discount_eligible_customer_stale_idx"
  ON "pricing"."discount_eligible_customer" (
    "store_id",
    "reference_status_changed_at",
    "discount_id"
  )
  WHERE "reference_status" = 'STALE';
