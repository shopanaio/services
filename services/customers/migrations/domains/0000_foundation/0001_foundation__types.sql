CREATE TYPE "customers"."customer_lifecycle_status" AS ENUM (
  'active',
  'disabled',
  'blocked',
  'merged',
  'redacted'
);

CREATE TYPE "customers"."customer_account_status" AS ENUM (
  'guest',
  'invited',
  'registered'
);

CREATE TYPE "customers"."address_validation_status" AS ENUM (
  'unvalidated',
  'valid',
  'invalid'
);

CREATE TYPE "customers"."tax_identifier_status" AS ENUM (
  'unverified',
  'verified',
  'rejected',
  'expired'
);

CREATE TYPE "customers"."tax_exemption_status" AS ENUM (
  'active',
  'expired',
  'revoked'
);

CREATE TYPE "customers"."consent_channel" AS ENUM (
  'email',
  'sms',
  'whatsapp',
  'push'
);

CREATE TYPE "customers"."consent_state" AS ENUM (
  'not_subscribed',
  'pending',
  'subscribed',
  'unsubscribed',
  'invalid',
  'redacted'
);

CREATE TYPE "customers"."consent_opt_in_level" AS ENUM (
  'unknown',
  'single_opt_in',
  'confirmed_opt_in'
);

CREATE TYPE "customers"."assignment_source" AS ENUM (
  'manual',
  'rule',
  'import',
  'system'
);

CREATE TYPE "customers"."customer_segment_type" AS ENUM (
  'manual',
  'dynamic'
);

CREATE TYPE "customers"."customer_segment_status" AS ENUM (
  'draft',
  'active',
  'archived'
);

CREATE TYPE "customers"."customer_merge_status" AS ENUM (
  'requested',
  'in_progress',
  'completed',
  'failed'
);

CREATE TYPE "customers"."customer_data_request_type" AS ENUM (
  'access',
  'export',
  'correction',
  'erasure'
);

CREATE TYPE "customers"."customer_data_request_status" AS ENUM (
  'pending',
  'processing',
  'completed',
  'rejected',
  'cancelled'
);
