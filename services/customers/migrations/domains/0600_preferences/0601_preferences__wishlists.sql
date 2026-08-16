-- Up Migration

CREATE TABLE "customers"."customer_wishlist" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "name" varchar(128) NOT NULL,
  "normalized_name" varchar(512) NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "customer_wishlist_customer_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_wishlist_name_check"
    CHECK (
      "name" = btrim("name")
      AND char_length("name") BETWEEN 1 AND 128
    ),
  CONSTRAINT "customer_wishlist_normalized_name_check"
    CHECK (
      "normalized_name" = btrim("normalized_name")
      AND char_length("normalized_name") BETWEEN 1 AND 512
    ),
  CONSTRAINT "customer_wishlist_updated_at_check"
    CHECK ("updated_at" >= "created_at")
);

CREATE UNIQUE INDEX "customer_wishlist_customer_name_unique"
  ON "customers"."customer_wishlist" ("customer_id", "normalized_name");

CREATE UNIQUE INDEX "customer_wishlist_customer_default_unique"
  ON "customers"."customer_wishlist" ("customer_id")
  WHERE "is_default" = true;

CREATE INDEX "customer_wishlist_store_customer_created_idx"
  ON "customers"."customer_wishlist" (
    "store_id",
    "customer_id",
    "created_at" ASC,
    "id" ASC
  );

CREATE TABLE "customers"."customer_wishlist_item" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "wishlist_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "added_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "customer_wishlist_item_wishlist_fk"
    FOREIGN KEY ("wishlist_id")
    REFERENCES "customers"."customer_wishlist" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_wishlist_item_wishlist_product_unique"
    UNIQUE ("wishlist_id", "product_id")
);

CREATE INDEX "customer_wishlist_item_store_product_idx"
  ON "customers"."customer_wishlist_item" ("store_id", "product_id");

CREATE INDEX "customer_wishlist_item_wishlist_added_idx"
  ON "customers"."customer_wishlist_item" (
    "wishlist_id",
    "added_at" DESC,
    "id" DESC
  );
