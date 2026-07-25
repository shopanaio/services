-- Up Migration

CREATE TABLE "apps"."slot_assignments" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "store_id" uuid NOT NULL,
  "aggregate" varchar(255) NOT NULL,
  "aggregate_id" varchar(255) NOT NULL,
  "slot_id" uuid NOT NULL,
  "domain" varchar(255) NOT NULL,
  "precedence" integer DEFAULT 0 NOT NULL,
  "status" "apps"."slot_assignment_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "slot_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "slot_assignments_slot_id_slots_id_fk"
    FOREIGN KEY ("slot_id")
    REFERENCES "apps"."slots" ("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);

CREATE INDEX "idx_slot_assignments_resolve"
  ON "apps"."slot_assignments" (
    "store_id",
    "aggregate",
    "aggregate_id",
    "domain",
    "status",
    "precedence"
  );

CREATE INDEX "idx_slot_assignments_slot"
  ON "apps"."slot_assignments" ("slot_id");

CREATE UNIQUE INDEX "slot_assignments_target_slot_key"
  ON "apps"."slot_assignments" (
    "store_id",
    "aggregate",
    "aggregate_id",
    "domain",
    "slot_id"
  );
