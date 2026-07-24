import { pgSchema } from "drizzle-orm/pg-core";

export const notificationsSchema = pgSchema("notifications");

export const notificationAudienceEnum = notificationsSchema.enum(
  "notification_audience",
  ["CUSTOMER", "STAFF", "INTEGRATION"]
);
export const notificationChannelEnum = notificationsSchema.enum(
  "notification_channel",
  ["EMAIL", "SMS", "WEBHOOK", "INTEGRATION"]
);
export const notificationPurposeEnum = notificationsSchema.enum(
  "notification_purpose",
  ["BUSINESS", "TEST"]
);
export const notificationOccurrenceStatusEnum = notificationsSchema.enum(
  "notification_occurrence_status",
  ["PENDING", "PROCESSING", "COMPLETED", "PARTIAL", "SKIPPED", "FAILED"]
);
export const notificationDeliveryStatusEnum = notificationsSchema.enum(
  "notification_delivery_status",
  [
    "PENDING",
    "RENDERING",
    "SENDING",
    "ACCEPTED",
    "DELIVERED",
    "RETRY_SCHEDULED",
    "UNKNOWN",
    "CANCELLED",
    "FAILED_PERMANENT",
    "DEAD",
    "SKIPPED",
    "BLOCKED_NO_PROVIDER",
  ]
);
export const notificationAttemptStatusEnum = notificationsSchema.enum(
  "notification_attempt_status",
  ["STARTED", "ACCEPTED", "DELIVERED", "FAILED", "UNKNOWN"]
);
export const templateValidationStatusEnum = notificationsSchema.enum(
  "template_validation_status",
  ["VALID", "INVALID"]
);
export const webhookFormatEnum = notificationsSchema.enum("webhook_format", [
  "JSON",
  "XML",
]);
export const webhookStatusEnum = notificationsSchema.enum("webhook_status", [
  "ACTIVE",
  "DISABLED",
]);
export const staffRecipientScopeEnum = notificationsSchema.enum(
  "staff_recipient_scope",
  ["ALL_ORDERS"]
);
