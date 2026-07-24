CREATE VIEW "notifications"."notification_definition_list" AS
SELECT
  "store_id",
  "definition_key",
  "enabled",
  "version",
  "updated_at"
FROM "notifications"."notification_definition_settings";

CREATE VIEW "notifications"."notification_delivery_operational_list" AS
SELECT
  d."id",
  d."store_id",
  o."definition_key",
  d."channel",
  d."purpose",
  d."status",
  d."provider_code",
  d."attempt_count",
  d."last_error_kind",
  d."last_error_code",
  d."created_at",
  d."updated_at"
FROM "notifications"."notification_deliveries" d
JOIN "notifications"."notification_occurrences" o
  ON o."id" = d."occurrence_id";
