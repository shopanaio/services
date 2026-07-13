-- Up Migration

CREATE TABLE "listing"."facet_source" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "facet_id" uuid NOT NULL,
  "facet_type" varchar(32) NOT NULL,
  "handle" text NOT NULL,
  "reference_status" "listing"."reference_status" NOT NULL DEFAULT 'VALID',
  "reference_status_changed_at" timestamp with time zone,
  "reference_checked_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "facet_source_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "facet_source_facet_id_fk"
    FOREIGN KEY ("facet_id")
    REFERENCES "listing"."facet" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "facet_source_store_facet_handle_uniq"
    UNIQUE ("store_id", "facet_id", "handle"),
  CONSTRAINT "facet_source_store_type_handle_uniq"
    UNIQUE ("store_id", "facet_type", "handle")
);

CREATE INDEX "idx_facet_source_store_facet"
  ON "listing"."facet_source" ("store_id", "facet_id");

CREATE INDEX "idx_facet_source_store_type_handle"
  ON "listing"."facet_source" ("store_id", "facet_type", "handle");

CREATE TABLE "listing"."facet_source_translation" (
  "facet_source_id" uuid NOT NULL,
  "locale" "listing"."locale_code" NOT NULL,
  "store_id" uuid NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "facet_source_translation_pkey" PRIMARY KEY ("facet_source_id", "locale"),
  CONSTRAINT "facet_source_translation_facet_source_id_fk"
    FOREIGN KEY ("facet_source_id")
    REFERENCES "listing"."facet_source" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_facet_source_translation_store_locale"
  ON "listing"."facet_source_translation" ("store_id", "locale");
