-- Up Migration
ALTER TABLE "catalog"."reservations"
  ADD COLUMN "expires_at" timestamptz;

CREATE INDEX "reservations_active_expiry_idx"
  ON "catalog"."reservations" ("expires_at", "id")
  WHERE "status" = 'ACTIVE' AND "expires_at" IS NOT NULL;
