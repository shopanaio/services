-- Up Migration

CREATE TABLE "pricing"."discount_target_selection" (
  "store_id" uuid NOT NULL,
  "discount_id" uuid NOT NULL,
  "role" "pricing"."discount_target_role" NOT NULL,
  "target_type" "pricing"."discount_target_type" NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "discount_target_selection_pkey"
    PRIMARY KEY ("discount_id", "role"),
  CONSTRAINT "discount_target_selection_discount_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "discount_target_selection_type_unique"
    UNIQUE ("discount_id", "role", "target_type")
);

CREATE INDEX "discount_target_selection_store_idx"
  ON "pricing"."discount_target_selection" (
    "store_id",
    "target_type",
    "discount_id",
    "role"
  );
