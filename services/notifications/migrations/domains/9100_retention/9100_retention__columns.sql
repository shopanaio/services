ALTER TABLE "notifications"."notification_occurrences"
  ADD COLUMN "pii_purged_at" timestamptz;

CREATE INDEX "notification_occurrence_retention_idx"
  ON "notifications"."notification_occurrences"
  ("pii_purged_at", "created_at");
