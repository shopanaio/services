-- Up Migration

CREATE TABLE "listing"."facet_scope" (
  "facet_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "scope_type" varchar(16) NOT NULL,
  CONSTRAINT "facet_scope_pkey" PRIMARY KEY ("facet_id", "scope_type"),
  CONSTRAINT "facet_scope_facet_id_fk"
    FOREIGN KEY ("facet_id")
    REFERENCES "listing"."facet" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "facet_scope_type_check"
    CHECK ("scope_type" IN ('SEARCH', 'CATEGORY'))
);

CREATE INDEX "idx_facet_scope_store_lookup"
  ON "listing"."facet_scope" (
    "store_id",
    "scope_type",
    "facet_id"
  );

CREATE FUNCTION "listing"."assert_facet_has_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  checked_facet_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'facet' THEN
    checked_facet_id := NEW."id";
  ELSE
    checked_facet_id := OLD."facet_id";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "listing"."facet" f
    WHERE f."id" = checked_facet_id
  ) AND NOT EXISTS (
    SELECT 1
    FROM "listing"."facet_scope" fs
    WHERE fs."facet_id" = checked_facet_id
  ) THEN
    RAISE EXCEPTION 'facet % must belong to at least one scope', checked_facet_id
      USING ERRCODE = '23514',
            CONSTRAINT = 'facet_has_scope';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "facet_has_scope_from_facet"
AFTER INSERT OR UPDATE ON "listing"."facet"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "listing"."assert_facet_has_scope"();

CREATE CONSTRAINT TRIGGER "facet_has_scope_from_scope"
AFTER DELETE OR UPDATE ON "listing"."facet_scope"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "listing"."assert_facet_has_scope"();
