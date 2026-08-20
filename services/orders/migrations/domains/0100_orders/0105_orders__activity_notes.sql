-- Up Migration

CREATE TABLE "orders"."order_admin_notes" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "body" text NOT NULL,
  "created_by_type" "orders"."order_actor_type" NOT NULL,
  "created_by_id" uuid,
  "updated_by_type" "orders"."order_actor_type" NOT NULL,
  "updated_by_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_admin_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_admin_notes_store_order_id_unique" UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_admin_notes_order_fk" FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_admin_notes_body_check" CHECK (btrim("body") <> ''),
  CONSTRAINT "order_admin_notes_actor_check" CHECK (
    ("created_by_type" = 'SYSTEM' OR "created_by_id" IS NOT NULL)
    AND ("updated_by_type" = 'SYSTEM' OR "updated_by_id" IS NOT NULL)
  )
);

CREATE INDEX "order_admin_notes_order_idx"
  ON "orders"."order_admin_notes" ("store_id", "order_id", "created_at" DESC, "id" DESC);

CREATE TRIGGER "order_admin_notes_touch_updated_at"
BEFORE UPDATE ON "orders"."order_admin_notes"
FOR EACH ROW EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_activity" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "global_position" bigint GENERATED ALWAYS AS IDENTITY,
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "order_version" integer NOT NULL,
  "activity_type" varchar(128) NOT NULL,
  "visibility" "orders"."order_event_visibility" NOT NULL DEFAULT 'INTERNAL',
  "actor_type" "orders"."order_actor_type" NOT NULL,
  "actor_id" uuid,
  "message" text,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "happened_at" timestamp with time zone NOT NULL DEFAULT now(),
  "recorded_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_activity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_activity_global_position_unique" UNIQUE ("global_position"),
  CONSTRAINT "order_activity_order_fk" FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_activity_version_check" CHECK ("order_version" > 0),
  CONSTRAINT "order_activity_type_check" CHECK (btrim("activity_type") <> ''),
  CONSTRAINT "order_activity_payload_check" CHECK (jsonb_typeof("payload") = 'object'),
  CONSTRAINT "order_activity_actor_check" CHECK ("actor_type" = 'SYSTEM' OR "actor_id" IS NOT NULL)
);

CREATE INDEX "order_activity_timeline_idx"
  ON "orders"."order_activity" ("store_id", "order_id", "happened_at" DESC, "global_position" DESC);

CREATE TRIGGER "order_activity_append_only"
BEFORE UPDATE OR DELETE ON "orders"."order_activity"
FOR EACH ROW EXECUTE FUNCTION "orders"."reject_row_mutation"();
