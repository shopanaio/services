-- Up Migration

-- Catalog-owned product, variant, and collection IDs are intentionally not
-- protected by cross-service foreign keys. The pricing service validates them
-- through catalog and records staleness without losing historical rules.
CREATE TABLE "pricing"."discount_target" (
  "store_id" uuid NOT NULL,
  "discount_id" uuid NOT NULL,
  "role" "pricing"."discount_target_role" NOT NULL,
  "target_type" "pricing"."discount_target_type" NOT NULL,
  "target_id" uuid NOT NULL,
  "reference_status" "pricing"."reference_status" NOT NULL DEFAULT 'VALID',
  "reference_status_changed_at" timestamptz,
  "reference_checked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "discount_target_pkey"
    PRIMARY KEY ("discount_id", "role", "target_id"),
  CONSTRAINT "discount_target_selection_fk"
    FOREIGN KEY ("discount_id", "role", "target_type")
    REFERENCES "pricing"."discount_target_selection" (
      "discount_id",
      "role",
      "target_type"
    )
    ON DELETE CASCADE,
  CONSTRAINT "discount_target_specific_type_check"
    CHECK ("target_type" <> 'ALL_PRODUCTS'),
  CONSTRAINT "discount_target_reference_status_check"
    CHECK (
      "reference_status" = 'VALID'
      OR "reference_status_changed_at" IS NOT NULL
    )
);

CREATE INDEX "discount_target_store_reverse_lookup_idx"
  ON "pricing"."discount_target" (
    "store_id",
    "target_type",
    "target_id",
    "discount_id",
    "role"
  );

CREATE INDEX "discount_target_stale_idx"
  ON "pricing"."discount_target" (
    "store_id",
    "reference_status_changed_at",
    "discount_id",
    "role"
  )
  WHERE "reference_status" = 'STALE';
