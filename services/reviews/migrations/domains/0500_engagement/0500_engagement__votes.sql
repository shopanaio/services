-- Up Migration

CREATE TABLE "reviews"."content_vote" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "content_id" uuid NOT NULL,
  "voter_customer_id" uuid,
  "voter_key" varchar(160) NOT NULL,
  "type" "reviews"."content_vote_type" NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "content_vote_content_fk"
    FOREIGN KEY ("content_id")
    REFERENCES "reviews"."content_item" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "content_vote_voter_unique"
    UNIQUE ("content_id", "voter_key"),
  CONSTRAINT "content_vote_voter_key_check"
    CHECK (length(btrim("voter_key")) > 0)
);

CREATE INDEX "content_vote_content_type_idx"
  ON "reviews"."content_vote" ("content_id", "type", "id");

CREATE INDEX "content_vote_store_customer_idx"
  ON "reviews"."content_vote" ("store_id", "voter_customer_id", "created_at" DESC, "id")
  WHERE "voter_customer_id" IS NOT NULL;
