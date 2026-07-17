-- Up Migration

-- Customer segment IDs are owned by the customers service; no cross-service FK.
CREATE TABLE "pricing"."discount_eligible_segment" (
  "store_id" uuid NOT NULL,
  "discount_id" uuid NOT NULL,
  "segment_id" uuid NOT NULL,
  "reference_status" "pricing"."reference_status" NOT NULL DEFAULT 'VALID',
  "reference_status_changed_at" timestamptz,
  "reference_checked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "discount_eligible_segment_pkey"
    PRIMARY KEY ("discount_id", "segment_id"),
  CONSTRAINT "discount_eligible_segment_context_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount_buyer_context" ("discount_id")
    ON DELETE CASCADE,
  CONSTRAINT "discount_eligible_segment_reference_status_check"
    CHECK (
      "reference_status" = 'VALID'
      OR "reference_status_changed_at" IS NOT NULL
    )
);

CREATE INDEX "discount_eligible_segment_store_lookup_idx"
  ON "pricing"."discount_eligible_segment" (
    "store_id",
    "segment_id",
    "discount_id"
  );

CREATE INDEX "discount_eligible_segment_stale_idx"
  ON "pricing"."discount_eligible_segment" (
    "store_id",
    "reference_status_changed_at",
    "discount_id"
  )
  WHERE "reference_status" = 'STALE';
