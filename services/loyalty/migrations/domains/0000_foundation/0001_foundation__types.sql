CREATE TYPE "loyalty"."program_status" AS ENUM (
  'DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'
);

CREATE TYPE "loyalty"."program_version_status" AS ENUM (
  'DRAFT', 'SCHEDULED', 'ACTIVE', 'RETIRED'
);

CREATE TYPE "loyalty"."rounding_mode" AS ENUM ('DOWN', 'NEAREST', 'UP');
CREATE TYPE "loyalty"."refund_policy" AS ENUM ('PROPORTIONAL', 'FULL_REVERSAL');
CREATE TYPE "loyalty"."debt_policy" AS ENUM ('TRACK_DEBT', 'REJECT_REVERSAL');
CREATE TYPE "loyalty"."restored_points_expiry_policy" AS ENUM (
  'ORIGINAL_EXPIRY', 'RESET_FROM_RESTORE'
);

CREATE TYPE "loyalty"."account_status" AS ENUM (
  'ACTIVE', 'SUSPENDED', 'CLOSED', 'MERGED'
);

CREATE TYPE "loyalty"."balance_bucket" AS ENUM (
  'PENDING', 'AVAILABLE', 'RESERVED', 'DEBT'
);

CREATE TYPE "loyalty"."transaction_kind" AS ENUM (
  'EARN_PENDING',
  'ACTIVATE',
  'RESERVE',
  'RELEASE',
  'REDEEM',
  'EXPIRE',
  'REVERSE_EARN',
  'RESTORE_REDEEM',
  'ADJUST_CREDIT',
  'ADJUST_DEBIT',
  'MERGE_TRANSFER',
  'DEBT_RECOVERY'
);

CREATE TYPE "loyalty"."transaction_source" AS ENUM (
  'ORDER', 'CHECKOUT', 'REFUND', 'EXPIRATION', 'ADMIN', 'MERGE', 'IMPORT', 'SYSTEM'
);

CREATE TYPE "loyalty"."actor_type" AS ENUM (
  'ADMIN_USER', 'CUSTOMER', 'SERVICE', 'SYSTEM'
);

CREATE TYPE "loyalty"."lot_allocation_type" AS ENUM (
  'REDEEM', 'EXPIRE', 'REVERSE', 'MERGE'
);

CREATE TYPE "loyalty"."reservation_status" AS ENUM (
  'ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED', 'REVERSED'
);

CREATE TYPE "loyalty"."reservation_event_type" AS ENUM (
  'CREATED', 'COMMITTED', 'RELEASED', 'EXPIRED', 'REVERSED'
);

CREATE TYPE "loyalty"."tier_membership_status" AS ENUM (
  'ACTIVE', 'EXPIRED', 'REVOKED'
);

CREATE TYPE "loyalty"."tier_membership_event_type" AS ENUM (
  'QUALIFIED', 'UPGRADED', 'DOWNGRADED', 'RENEWED', 'EXPIRED', 'REVOKED'
);
