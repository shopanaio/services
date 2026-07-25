-- Up Migration

CREATE TABLE "apps"."slots" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "store_id" uuid NOT NULL,
  "status" "apps"."slot_status" DEFAULT 'active' NOT NULL,
  "installation_id" uuid NOT NULL,
  "capability" varchar(128) NOT NULL,
  "assignment_mode" varchar(16) DEFAULT 'store' NOT NULL,
  "operation_contract" varchar(128) NOT NULL,
  "target_app_code" varchar(128) NOT NULL,
  "target_action" varchar(128) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "slots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "slots_installation_id_app_installations_id_fk"
    FOREIGN KEY ("installation_id")
    REFERENCES "apps"."app_installations" ("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "slots_installation_capability_operation_key"
  ON "apps"."slots" (
    "installation_id",
    "capability",
    "operation_contract"
  );

CREATE INDEX "slots_installation_idx"
  ON "apps"."slots" ("installation_id");

CREATE INDEX "slots_capability_route_idx"
  ON "apps"."slots" (
    "store_id",
    "capability",
    "operation_contract",
    "status"
  );
