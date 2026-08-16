CREATE TYPE "customers"."customer_lifecycle_status" AS ENUM (
  'ACTIVE',
  'DISABLED',
  'BLOCKED',
  'MERGED',
  'REDACTED'
);

CREATE TYPE "customers"."customer_account_status" AS ENUM (
  'GUEST',
  'INVITED',
  'REGISTERED'
);

CREATE TYPE "customers"."address_validation_status" AS ENUM (
  'UNVALIDATED',
  'VALID',
  'INVALID'
);

CREATE TYPE "customers"."tax_identifier_status" AS ENUM (
  'UNVERIFIED',
  'VERIFIED',
  'REJECTED',
  'EXPIRED'
);

CREATE TYPE "customers"."tax_exemption_status" AS ENUM (
  'ACTIVE',
  'EXPIRED',
  'REVOKED'
);

CREATE TYPE "customers"."consent_channel" AS ENUM (
  'EMAIL',
  'SMS',
  'WHATSAPP',
  'PUSH'
);

CREATE TYPE "customers"."consent_state" AS ENUM (
  'NOT_SUBSCRIBED',
  'PENDING',
  'SUBSCRIBED',
  'UNSUBSCRIBED',
  'INVALID',
  'REDACTED'
);

CREATE TYPE "customers"."consent_opt_in_level" AS ENUM (
  'UNKNOWN',
  'SINGLE_OPT_IN',
  'CONFIRMED_OPT_IN'
);

CREATE TYPE "customers"."assignment_source" AS ENUM (
  'MANUAL',
  'RULE',
  'IMPORT',
  'SYSTEM'
);

CREATE TYPE "customers"."customer_segment_type" AS ENUM (
  'MANUAL',
  'DYNAMIC'
);

CREATE TYPE "customers"."customer_segment_status" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'ARCHIVED'
);

CREATE TYPE "customers"."customer_segment_materialization_status" AS ENUM (
  'PENDING',
  'RUNNING',
  'READY',
  'FAILED'
);

CREATE TYPE "customers"."customer_segment_materialization_run_status" AS ENUM (
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED'
);

CREATE TYPE "customers"."customer_merge_status" AS ENUM (
  'REQUESTED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED'
);

CREATE TYPE "customers"."customer_data_request_type" AS ENUM (
  'ACCESS',
  'EXPORT',
  'CORRECTION',
  'ERASURE'
);

CREATE TYPE "customers"."customer_data_request_status" AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'REJECTED',
  'CANCELLED'
);
