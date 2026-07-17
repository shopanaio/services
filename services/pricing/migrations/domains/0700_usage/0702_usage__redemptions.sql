-- Up Migration

CREATE TABLE "pricing"."discount_redemption" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "discount_id" uuid NOT NULL,
  "code_id" uuid,
  "reservation_id" uuid,
  "customer_id" uuid,
  "checkout_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "idempotency_key" text NOT NULL,
  "status" "pricing"."discount_redemption_status" NOT NULL DEFAULT 'COMMITTED',
  "discount_class" "pricing"."discount_class" NOT NULL,
  "configuration_revision" integer NOT NULL,
  "currency" "pricing"."currency_code" NOT NULL,
  "amount_minor" bigint NOT NULL,
  "committed_at" timestamptz NOT NULL DEFAULT now(),
  "reversed_at" timestamptz,
  "reversal_reason" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "discount_redemption_discount_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount" ("id")
    ON DELETE RESTRICT,
  CONSTRAINT "discount_redemption_code_fk"
    FOREIGN KEY ("discount_id", "code_id")
    REFERENCES "pricing"."discount_code" ("discount_id", "id")
    ON DELETE RESTRICT,
  CONSTRAINT "discount_redemption_reservation_fk"
    FOREIGN KEY ("discount_id", "reservation_id")
    REFERENCES "pricing"."discount_usage_reservation" (
      "discount_id",
      "id"
    )
    ON DELETE RESTRICT,
  CONSTRAINT "discount_redemption_store_id_unique"
    UNIQUE ("store_id", "id"),
  CONSTRAINT "discount_redemption_store_discount_id_unique"
    UNIQUE ("store_id", "discount_id", "id"),
  CONSTRAINT "discount_redemption_discount_id_id_unique"
    UNIQUE ("discount_id", "id"),
  CONSTRAINT "discount_redemption_idempotency_unique"
    UNIQUE ("store_id", "idempotency_key"),
  CONSTRAINT "discount_redemption_order_unique"
    UNIQUE ("store_id", "discount_id", "order_id"),
  CONSTRAINT "discount_redemption_reservation_unique"
    UNIQUE ("reservation_id"),
  CONSTRAINT "discount_redemption_idempotency_check"
    CHECK (length(btrim("idempotency_key")) > 0),
  CONSTRAINT "discount_redemption_revision_check"
    CHECK ("configuration_revision" >= 0),
  CONSTRAINT "discount_redemption_amount_check"
    CHECK ("amount_minor" >= 0),
  CONSTRAINT "discount_redemption_status_check"
    CHECK (
      (
        "status" = 'COMMITTED'
        AND "reversed_at" IS NULL
        AND "reversal_reason" IS NULL
      )
      OR (
        "status" = 'REVERSED'
        AND "reversed_at" IS NOT NULL
        AND "reversal_reason" IS NOT NULL
        AND length(btrim("reversal_reason")) > 0
      )
    ),
  CONSTRAINT "discount_redemption_reverse_time_check"
    CHECK ("reversed_at" IS NULL OR "reversed_at" >= "committed_at"),
  CONSTRAINT "discount_redemption_metadata_object_check"
    CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE INDEX "discount_redemption_store_committed_idx"
  ON "pricing"."discount_redemption" (
    "store_id",
    "committed_at" DESC,
    "id"
  );

CREATE INDEX "discount_redemption_discount_usage_idx"
  ON "pricing"."discount_redemption" (
    "store_id",
    "discount_id",
    "status",
    "committed_at" DESC,
    "id"
  );

CREATE INDEX "discount_redemption_customer_usage_idx"
  ON "pricing"."discount_redemption" (
    "store_id",
    "discount_id",
    "customer_id",
    "committed_at" DESC,
    "id"
  )
  WHERE "customer_id" IS NOT NULL;

CREATE INDEX "discount_redemption_code_usage_idx"
  ON "pricing"."discount_redemption" (
    "store_id",
    "code_id",
    "status",
    "committed_at" DESC,
    "id"
  )
  WHERE "code_id" IS NOT NULL;

CREATE TABLE "pricing"."discount_redemption_allocation" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "discount_id" uuid NOT NULL,
  "redemption_id" uuid NOT NULL,
  "target_type" "pricing"."discount_allocation_target_type" NOT NULL,
  "target_id" uuid,
  "quantity" integer,
  "amount_minor" bigint NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "discount_redemption_allocation_redemption_fk"
    FOREIGN KEY ("discount_id", "redemption_id")
    REFERENCES "pricing"."discount_redemption" (
      "discount_id",
      "id"
    )
    ON DELETE CASCADE,
  CONSTRAINT "discount_redemption_allocation_target_check"
    CHECK (
      ("target_type" = 'ORDER' AND "target_id" IS NULL)
      OR ("target_type" <> 'ORDER' AND "target_id" IS NOT NULL)
    ),
  CONSTRAINT "discount_redemption_allocation_quantity_check"
    CHECK ("quantity" IS NULL OR "quantity" > 0),
  CONSTRAINT "discount_redemption_allocation_amount_check"
    CHECK ("amount_minor" >= 0),
  CONSTRAINT "discount_redemption_allocation_metadata_object_check"
    CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE INDEX "discount_redemption_allocation_redemption_idx"
  ON "pricing"."discount_redemption_allocation" (
    "redemption_id",
    "target_type",
    "target_id",
    "id"
  );

CREATE INDEX "discount_redemption_allocation_target_idx"
  ON "pricing"."discount_redemption_allocation" (
    "store_id",
    "target_type",
    "target_id",
    "created_at" DESC,
    "id"
  )
  WHERE "target_id" IS NOT NULL;
