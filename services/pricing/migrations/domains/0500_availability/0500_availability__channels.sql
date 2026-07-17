-- Up Migration

-- Open channel codes keep the schema compatible with app-provided sales
-- channels. ONLINE_STORE and POS are conventional first-party values.
CREATE TABLE "pricing"."discount_channel" (
  "store_id" uuid NOT NULL,
  "discount_id" uuid NOT NULL,
  "channel_code" varchar(64) NOT NULL,
  "is_featured" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "discount_channel_pkey"
    PRIMARY KEY ("discount_id", "channel_code"),
  CONSTRAINT "discount_channel_discount_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "discount_channel_code_check"
    CHECK ("channel_code" ~ '^[A-Z][A-Z0-9_:-]{1,63}$')
);

CREATE INDEX "discount_channel_store_lookup_idx"
  ON "pricing"."discount_channel" (
    "store_id",
    "channel_code",
    "discount_id"
  );

CREATE INDEX "discount_channel_featured_idx"
  ON "pricing"."discount_channel" (
    "store_id",
    "channel_code",
    "discount_id"
  )
  WHERE "is_featured" = true;
