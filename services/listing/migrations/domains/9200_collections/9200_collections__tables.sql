-- Up Migration

CREATE TABLE "listing"."collection_state" (
  "store_id" uuid NOT NULL,
  "collection_id" uuid NOT NULL,
  "listing_revision" integer NOT NULL,
  "collection_type" varchar(16) NOT NULL,
  "default_sort" varchar(32) NOT NULL,
  "default_sort_direction" varchar(4) NOT NULL,
  "published_at" timestamp with time zone,
  "effective_from" timestamp with time zone,
  "effective_to" timestamp with time zone,
  "rules_json" jsonb NOT NULL,
  "rules_hash" text NOT NULL,
  "payload_hash" text NOT NULL,
  "event_sequence" bigint NOT NULL,
  "source_updated_at" timestamp with time zone NOT NULL,
  "projected_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "collection_state_pkey"
    PRIMARY KEY ("store_id", "collection_id"),
  CONSTRAINT "collection_state_type_check"
    CHECK ("collection_type" IN ('manual', 'rule')),
  CONSTRAINT "collection_state_sort_check"
    CHECK ("default_sort" IN ('manual', 'price', 'newest', 'name')),
  CONSTRAINT "collection_state_sort_direction_check"
    CHECK ("default_sort_direction" IN ('asc', 'desc')),
  CONSTRAINT "collection_state_sort_pair_check"
    CHECK (
      ("default_sort" = 'manual' AND "default_sort_direction" = 'asc')
      OR ("default_sort" = 'newest' AND "default_sort_direction" = 'desc')
      OR ("default_sort" IN ('price', 'name') AND "default_sort_direction" IN ('asc', 'desc'))
    ),
  CONSTRAINT "collection_state_rule_sort_check"
    CHECK ("collection_type" != 'rule' OR "default_sort" != 'manual'),
  CONSTRAINT "collection_state_manual_rules_check"
    CHECK ("collection_type" != 'manual' OR "rules_json" = '[]'::jsonb),
  CONSTRAINT "collection_state_listing_revision_check"
    CHECK ("listing_revision" BETWEEN 0 AND 2147483646),
  CONSTRAINT "collection_state_event_sequence_check"
    CHECK ("event_sequence" BETWEEN 1 AND 9007199254740991),
  CONSTRAINT "collection_state_rules_hash_check"
    CHECK ("rules_hash" ~ '^sha256:v1:[0-9a-f]{64}$'),
  CONSTRAINT "collection_state_payload_hash_check"
    CHECK ("payload_hash" ~ '^sha256:v1:[0-9a-f]{64}$'),
  CONSTRAINT "collection_state_effective_range_check"
    CHECK (
      "effective_to" IS NULL
      OR "effective_from" IS NULL
      OR "effective_to" > "effective_from"
    )
);

CREATE INDEX "idx_collection_state_visibility"
  ON "listing"."collection_state" (
    "store_id",
    "published_at",
    "effective_from",
    "effective_to"
  );

CREATE TABLE "listing"."collection_tombstone" (
  "store_id" uuid NOT NULL,
  "collection_id" uuid NOT NULL,
  "listing_revision" integer NOT NULL,
  "payload_hash" text NOT NULL,
  "event_sequence" bigint NOT NULL,
  "deleted_at" timestamp with time zone NOT NULL,
  "projected_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "collection_tombstone_pkey"
    PRIMARY KEY ("store_id", "collection_id"),
  CONSTRAINT "collection_tombstone_listing_revision_check"
    CHECK ("listing_revision" BETWEEN 0 AND 2147483646),
  CONSTRAINT "collection_tombstone_event_sequence_check"
    CHECK ("event_sequence" BETWEEN 1 AND 9007199254740991),
  CONSTRAINT "collection_tombstone_payload_hash_check"
    CHECK ("payload_hash" ~ '^sha256:v1:[0-9a-f]{64}$')
);
