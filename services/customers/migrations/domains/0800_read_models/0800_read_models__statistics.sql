CREATE TABLE "customers"."customer_statistics" (
  "customer_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "orders_count" integer NOT NULL DEFAULT 0,
  "completed_orders_count" integer NOT NULL DEFAULT 0,
  "cancelled_orders_count" integer NOT NULL DEFAULT 0,
  "returns_count" integer NOT NULL DEFAULT 0,
  "first_order_id" uuid,
  "first_order_at" timestamptz,
  "last_order_id" uuid,
  "last_order_at" timestamptz,
  "last_checkout_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "customer_statistics_customer_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_statistics_counts_check"
    CHECK (
      "orders_count" >= 0
      AND "completed_orders_count" >= 0
      AND "cancelled_orders_count" >= 0
      AND "returns_count" >= 0
      AND "completed_orders_count" + "cancelled_orders_count" <= "orders_count"
    ),
  CONSTRAINT "customer_statistics_first_order_pair_check"
    CHECK (("first_order_id" IS NULL) = ("first_order_at" IS NULL)),
  CONSTRAINT "customer_statistics_last_order_pair_check"
    CHECK (("last_order_id" IS NULL) = ("last_order_at" IS NULL)),
  CONSTRAINT "customer_statistics_order_time_check"
    CHECK (
      "first_order_at" IS NULL
      OR "last_order_at" IS NULL
      OR "last_order_at" >= "first_order_at"
    )
);

CREATE INDEX "customer_statistics_store_last_order_idx"
  ON "customers"."customer_statistics" ("store_id", "last_order_at" DESC, "customer_id");

CREATE INDEX "customer_statistics_store_orders_count_idx"
  ON "customers"."customer_statistics" ("store_id", "orders_count" DESC, "customer_id");

CREATE TABLE "customers"."customer_order_projection" (
  "order_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "revision" integer NOT NULL,
  "status" varchar(16) NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "total_amount_minor" bigint NOT NULL,
  "created_at" timestamptz NOT NULL,
  "completed_at" timestamptz,
  "cancelled_at" timestamptz,
  "updated_at" timestamptz NOT NULL,

  CONSTRAINT "customer_order_projection_customer_fk"
    FOREIGN KEY ("customer_id") REFERENCES "customers"."customer" ("id") ON DELETE CASCADE,
  CONSTRAINT "customer_order_projection_revision_check" CHECK ("revision" >= 0),
  CONSTRAINT "customer_order_projection_status_check"
    CHECK ("status" IN ('OPEN', 'COMPLETED', 'CANCELLED')),
  CONSTRAINT "customer_order_projection_currency_check"
    CHECK ("currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "customer_order_projection_amount_check" CHECK ("total_amount_minor" >= 0)
);

CREATE INDEX "customer_order_projection_customer_idx"
  ON "customers"."customer_order_projection"
  ("store_id", "customer_id", "created_at", "order_id");

CREATE TABLE "customers"."customer_checkout_projection" (
  "checkout_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "version" integer NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,

  CONSTRAINT "customer_checkout_projection_customer_fk"
    FOREIGN KEY ("customer_id") REFERENCES "customers"."customer" ("id") ON DELETE CASCADE,
  CONSTRAINT "customer_checkout_projection_version_check" CHECK ("version" >= 0)
);

CREATE INDEX "customer_checkout_projection_customer_idx"
  ON "customers"."customer_checkout_projection"
  ("store_id", "customer_id", "occurred_at", "checkout_id");

CREATE TABLE "customers"."customer_refund_projection" (
  "refund_id" text PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "revision" integer NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "amount_minor" bigint NOT NULL,
  "refunded_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,

  CONSTRAINT "customer_refund_projection_customer_fk"
    FOREIGN KEY ("customer_id") REFERENCES "customers"."customer" ("id") ON DELETE CASCADE,
  CONSTRAINT "customer_refund_projection_revision_check" CHECK ("revision" >= 0),
  CONSTRAINT "customer_refund_projection_currency_check"
    CHECK ("currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "customer_refund_projection_amount_check" CHECK ("amount_minor" >= 0)
);

CREATE INDEX "customer_refund_projection_customer_idx"
  ON "customers"."customer_refund_projection"
  ("store_id", "customer_id", "currency_code", "refund_id");

CREATE INDEX "customer_refund_projection_order_idx"
  ON "customers"."customer_refund_projection" ("order_id");

CREATE TABLE "customers"."customer_monetary_statistics" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "orders_count" integer NOT NULL DEFAULT 0,
  "total_spent_minor" bigint NOT NULL DEFAULT 0,
  "total_refunded_minor" bigint NOT NULL DEFAULT 0,
  "net_spent_minor" bigint NOT NULL DEFAULT 0,
  "average_order_value_minor" bigint NOT NULL DEFAULT 0,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "customer_monetary_statistics_customer_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_monetary_statistics_customer_currency_unique"
    UNIQUE ("customer_id", "currency_code"),
  CONSTRAINT "customer_monetary_statistics_currency_check"
    CHECK ("currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "customer_monetary_statistics_values_check"
    CHECK (
      "orders_count" >= 0
      AND "total_spent_minor" >= 0
      AND "total_refunded_minor" >= 0
      AND "total_refunded_minor" <= "total_spent_minor"
      AND "net_spent_minor" = "total_spent_minor" - "total_refunded_minor"
      AND "average_order_value_minor" >= 0
    )
);

CREATE INDEX "customer_monetary_statistics_store_spend_idx"
  ON "customers"."customer_monetary_statistics" (
    "store_id",
    "currency_code",
    "net_spent_minor" DESC,
    "customer_id"
  );
