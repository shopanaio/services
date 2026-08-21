-- Up Migration

CREATE TABLE "orders"."order_edit_sessions" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "status" "orders"."order_edit_status" NOT NULL DEFAULT 'ACTIVE',
  "currency_code" varchar(3) NOT NULL,
  "subtotal_amount" bigint NOT NULL,
  "discount_amount" bigint NOT NULL DEFAULT 0,
  "shipping_amount" bigint NOT NULL DEFAULT 0,
  "tax_amount" bigint NOT NULL DEFAULT 0,
  "duty_amount" bigint NOT NULL DEFAULT 0,
  "adjustment_amount" bigint NOT NULL DEFAULT 0,
  "total_amount" bigint NOT NULL,
  "created_by_type" "orders"."order_actor_type" NOT NULL,
  "created_by_id" uuid,
  "expires_at" timestamp with time zone NOT NULL,
  "committed_at" timestamp with time zone,
  "aborted_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_edit_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_edit_sessions_store_order_id_unique" UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_edit_sessions_order_currency_fk" FOREIGN KEY ("store_id", "order_id", "currency_code")
    REFERENCES "orders"."orders" ("store_id", "id", "currency_code"),
  CONSTRAINT "order_edit_sessions_total_check" CHECK (
    "total_amount" = "subtotal_amount" - "discount_amount" + "shipping_amount" + "tax_amount" + "duty_amount" + "adjustment_amount"
  ),
  CONSTRAINT "order_edit_sessions_actor_check" CHECK ("created_by_type" = 'SYSTEM' OR "created_by_id" IS NOT NULL),
  CONSTRAINT "order_edit_sessions_terminal_check" CHECK (
    ("status" = 'COMMITTED' AND "committed_at" IS NOT NULL)
    OR ("status" = 'ABORTED' AND "aborted_at" IS NOT NULL)
    OR ("status" IN ('ACTIVE', 'EXPIRED') AND "committed_at" IS NULL AND "aborted_at" IS NULL)
  )
);

CREATE UNIQUE INDEX "order_edit_sessions_one_active_idx"
  ON "orders"."order_edit_sessions" ("store_id", "order_id") WHERE "status" = 'ACTIVE';

CREATE INDEX "order_edit_sessions_expiry_idx"
  ON "orders"."order_edit_sessions" ("expires_at") WHERE "status" = 'ACTIVE';

CREATE TRIGGER "order_edit_sessions_touch_updated_at"
BEFORE UPDATE ON "orders"."order_edit_sessions"
FOR EACH ROW EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_edit_changes" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "edit_session_id" uuid NOT NULL,
  "sequence" integer NOT NULL,
  "change_type" varchar(128) NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_edit_changes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_edit_changes_sequence_unique" UNIQUE ("store_id", "edit_session_id", "sequence"),
  CONSTRAINT "order_edit_changes_session_fk" FOREIGN KEY ("store_id", "order_id", "edit_session_id")
    REFERENCES "orders"."order_edit_sessions" ("store_id", "order_id", "id"),
  CONSTRAINT "order_edit_changes_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "order_edit_changes_type_check" CHECK (btrim("change_type") <> ''),
  CONSTRAINT "order_edit_changes_payload_check" CHECK (jsonb_typeof("payload") = 'object')
);

CREATE INDEX "order_edit_changes_session_idx"
  ON "orders"."order_edit_changes" ("store_id", "edit_session_id", "sequence");

CREATE TRIGGER "order_edit_changes_append_only"
BEFORE UPDATE OR DELETE ON "orders"."order_edit_changes"
FOR EACH ROW EXECUTE FUNCTION "orders"."reject_row_mutation"();
