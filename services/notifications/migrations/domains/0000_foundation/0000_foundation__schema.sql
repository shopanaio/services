CREATE SCHEMA IF NOT EXISTS "notifications";

CREATE TYPE "notifications"."notification_audience" AS ENUM (
  'CUSTOMER', 'STAFF'
);
CREATE TYPE "notifications"."notification_channel" AS ENUM (
  'EMAIL', 'SMS', 'WEBHOOK'
);
CREATE TYPE "notifications"."notification_purpose" AS ENUM (
  'BUSINESS', 'TEST'
);
CREATE TYPE "notifications"."notification_occurrence_status" AS ENUM (
  'PENDING', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'SKIPPED', 'FAILED'
);
CREATE TYPE "notifications"."notification_delivery_status" AS ENUM (
  'PENDING', 'RENDERING', 'SENDING', 'ACCEPTED', 'DELIVERED',
  'RETRY_SCHEDULED', 'UNKNOWN', 'CANCELLED', 'FAILED_PERMANENT',
  'DEAD', 'SKIPPED', 'BLOCKED_NO_PROVIDER'
);
CREATE TYPE "notifications"."notification_attempt_status" AS ENUM (
  'STARTED', 'ACCEPTED', 'DELIVERED', 'FAILED', 'UNKNOWN'
);
CREATE TYPE "notifications"."template_validation_status" AS ENUM (
  'VALID', 'INVALID'
);
CREATE TYPE "notifications"."webhook_format" AS ENUM ('JSON', 'XML');
CREATE TYPE "notifications"."webhook_status" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "notifications"."staff_recipient_scope" AS ENUM ('ALL_ORDERS');
