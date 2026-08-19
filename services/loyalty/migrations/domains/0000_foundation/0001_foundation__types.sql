CREATE TYPE "loyalty"."program_status" AS ENUM (
  'DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'
);

CREATE TYPE "loyalty"."program_version_status" AS ENUM (
  'DRAFT', 'SCHEDULED', 'ACTIVE', 'RETIRED'
);

-- Reconciliation state for cross-service references (segments, catalog
-- selectors, Pricing discounts) carried by an already-published program
-- version's rules. This is mutable operational metadata, not part of the
-- immutable `rules` JSON: a reference validated at publish time can go
-- stale later if the referenced entity is deleted in another service.
CREATE TYPE "loyalty"."reference_reconciliation_status" AS ENUM (
  'VALID', 'STALE'
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

CREATE TYPE "loyalty"."earning_trigger_type" AS ENUM (
  'ORDER',
  'SIGNUP',
  'REVIEW',
  'REFERRAL',
  'BIRTHDAY',
  'ANNIVERSARY',
  'LOGIN',
  'SUBSCRIPTION_RENEWAL',
  'CUSTOM_EVENT'
);

CREATE TYPE "loyalty"."earning_action_type" AS ENUM (
  'AWARD_FIXED_POINTS',
  'AWARD_SPEND_RATIO',
  'AWARD_CASHBACK',
  'APPLY_MULTIPLIER',
  'ISSUE_REWARD'
);

CREATE TYPE "loyalty"."loyalty_event_evaluation_decision" AS ENUM (
  'AWARDED', 'INELIGIBLE', 'LIMIT_REACHED', 'BUDGET_EXHAUSTED', 'IGNORED'
);

CREATE TYPE "loyalty"."reward_type" AS ENUM (
  'POINTS',
  'VOUCHER',
  'FIXED_DISCOUNT',
  'PERCENTAGE_DISCOUNT',
  'FREE_SHIPPING',
  'FREE_PRODUCT',
  'MEMBER_BENEFIT',
  'MONETARY_CREDIT'
);

CREATE TYPE "loyalty"."reward_entitlement_status" AS ENUM (
  'ISSUED', 'RESERVED', 'REDEEMED', 'EXPIRED', 'REVOKED'
);

CREATE TYPE "loyalty"."reward_entitlement_event_type" AS ENUM (
  'ISSUED', 'RESERVED', 'RELEASED', 'REDEEMED', 'EXPIRED', 'REVOKED'
);

CREATE TYPE "loyalty"."tier_evaluation_window_type" AS ENUM (
  'LIFETIME', 'ROLLING', 'CALENDAR'
);

CREATE TYPE "loyalty"."tier_calendar_period" AS ENUM (
  'MONTH', 'QUARTER', 'YEAR', 'PROGRAM_YEAR'
);

CREATE TYPE "loyalty"."tier_downgrade_policy" AS ENUM (
  'IMMEDIATE', 'GRACE_PERIOD', 'END_OF_MEMBERSHIP'
);

CREATE TYPE "loyalty"."tier_requalification_policy" AS ENUM (
  'AUTOMATIC', 'MANUAL'
);

CREATE TYPE "loyalty"."monetary_wallet_type" AS ENUM (
  'CASHBACK', 'STORE_CREDIT'
);

CREATE TYPE "loyalty"."monetary_wallet_status" AS ENUM (
  'ACTIVE', 'SUSPENDED', 'CLOSED', 'MERGED'
);

CREATE TYPE "loyalty"."monetary_balance_bucket" AS ENUM (
  'PENDING', 'AVAILABLE', 'RESERVED', 'DEBT'
);

CREATE TYPE "loyalty"."monetary_transaction_kind" AS ENUM (
  'EARN_PENDING',
  'ACTIVATE',
  'RESERVE',
  'RELEASE',
  'SPEND',
  'EXPIRE',
  'REVERSE_EARN',
  'RESTORE_SPEND',
  'ADJUST_CREDIT',
  'ADJUST_DEBIT',
  'MERGE_TRANSFER',
  'DEBT_RECOVERY'
);
