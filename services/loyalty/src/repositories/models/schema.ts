import { pgSchema } from "drizzle-orm/pg-core";

/** Drizzle namespace for the SQL-first Loyalty schema. */
export const loyaltySchema = pgSchema("loyalty");

export const programStatusEnum = loyaltySchema.enum("program_status", [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
]);
export const programVersionStatusEnum = loyaltySchema.enum("program_version_status", [
  "DRAFT",
  "SCHEDULED",
  "ACTIVE",
  "RETIRED",
]);
export const referenceReconciliationStatusEnum = loyaltySchema.enum(
  "reference_reconciliation_status",
  ["VALID", "STALE"],
);
export const roundingModeEnum = loyaltySchema.enum("rounding_mode", ["DOWN", "NEAREST", "UP"]);
export const refundPolicyEnum = loyaltySchema.enum("refund_policy", [
  "PROPORTIONAL",
  "FULL_REVERSAL",
]);
export const debtPolicyEnum = loyaltySchema.enum("debt_policy", ["TRACK_DEBT", "REJECT_REVERSAL"]);
export const restoredPointsExpiryPolicyEnum = loyaltySchema.enum("restored_points_expiry_policy", [
  "ORIGINAL_EXPIRY",
  "RESET_FROM_RESTORE",
]);
export const accountStatusEnum = loyaltySchema.enum("account_status", [
  "ACTIVE",
  "SUSPENDED",
  "CLOSED",
  "MERGED",
]);
export const balanceBucketEnum = loyaltySchema.enum("balance_bucket", [
  "PENDING",
  "AVAILABLE",
  "RESERVED",
  "DEBT",
]);
export const transactionKindEnum = loyaltySchema.enum("transaction_kind", [
  "EARN_PENDING",
  "ACTIVATE",
  "RESERVE",
  "RELEASE",
  "REDEEM",
  "EXPIRE",
  "REVERSE_EARN",
  "RESTORE_REDEEM",
  "ADJUST_CREDIT",
  "ADJUST_DEBIT",
  "MERGE_TRANSFER",
  "DEBT_RECOVERY",
]);
export const transactionSourceEnum = loyaltySchema.enum("transaction_source", [
  "ORDER",
  "CHECKOUT",
  "REFUND",
  "EXPIRATION",
  "ADMIN",
  "MERGE",
  "IMPORT",
  "SYSTEM",
]);
export const actorTypeEnum = loyaltySchema.enum("actor_type", [
  "ADMIN_USER",
  "CUSTOMER",
  "SERVICE",
  "SYSTEM",
]);
export const lotAllocationTypeEnum = loyaltySchema.enum("lot_allocation_type", [
  "REDEEM",
  "EXPIRE",
  "REVERSE",
  "MERGE",
]);
export const reservationStatusEnum = loyaltySchema.enum("reservation_status", [
  "ACTIVE",
  "COMMITTED",
  "RELEASED",
  "EXPIRED",
  "REVERSED",
]);
export const reservationEventTypeEnum = loyaltySchema.enum("reservation_event_type", [
  "CREATED",
  "COMMITTED",
  "RELEASED",
  "EXPIRED",
  "REVERSED",
]);
export const tierMembershipStatusEnum = loyaltySchema.enum("tier_membership_status", [
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
]);
export const tierMembershipEventTypeEnum = loyaltySchema.enum("tier_membership_event_type", [
  "QUALIFIED",
  "UPGRADED",
  "DOWNGRADED",
  "RENEWED",
  "EXPIRED",
  "REVOKED",
]);
export const earningTriggerTypeEnum = loyaltySchema.enum("earning_trigger_type", [
  "ORDER",
  "SIGNUP",
  "REVIEW",
  "REFERRAL",
  "BIRTHDAY",
  "ANNIVERSARY",
  "LOGIN",
  "SUBSCRIPTION_RENEWAL",
  "CUSTOM_EVENT",
]);
export const earningActionTypeEnum = loyaltySchema.enum("earning_action_type", [
  "AWARD_FIXED_POINTS",
  "AWARD_SPEND_RATIO",
  "AWARD_CASHBACK",
  "APPLY_MULTIPLIER",
  "ISSUE_REWARD",
]);
export const loyaltyEventEvaluationDecisionEnum = loyaltySchema.enum(
  "loyalty_event_evaluation_decision",
  ["AWARDED", "INELIGIBLE", "LIMIT_REACHED", "BUDGET_EXHAUSTED", "IGNORED"],
);
export const rewardTypeEnum = loyaltySchema.enum("reward_type", [
  "POINTS",
  "VOUCHER",
  "FIXED_DISCOUNT",
  "PERCENTAGE_DISCOUNT",
  "FREE_SHIPPING",
  "FREE_PRODUCT",
  "MEMBER_BENEFIT",
  "MONETARY_CREDIT",
]);
export const rewardEntitlementStatusEnum = loyaltySchema.enum("reward_entitlement_status", [
  "ISSUED",
  "RESERVED",
  "REDEEMED",
  "EXPIRED",
  "REVOKED",
]);
export const rewardEntitlementEventTypeEnum = loyaltySchema.enum("reward_entitlement_event_type", [
  "ISSUED",
  "RESERVED",
  "RELEASED",
  "REDEEMED",
  "EXPIRED",
  "REVOKED",
]);
export const tierEvaluationWindowTypeEnum = loyaltySchema.enum("tier_evaluation_window_type", [
  "LIFETIME",
  "ROLLING",
  "CALENDAR",
]);
export const tierCalendarPeriodEnum = loyaltySchema.enum("tier_calendar_period", [
  "MONTH",
  "QUARTER",
  "YEAR",
  "PROGRAM_YEAR",
]);
export const tierDowngradePolicyEnum = loyaltySchema.enum("tier_downgrade_policy", [
  "IMMEDIATE",
  "GRACE_PERIOD",
  "END_OF_MEMBERSHIP",
]);
export const tierRequalificationPolicyEnum = loyaltySchema.enum("tier_requalification_policy", [
  "AUTOMATIC",
  "MANUAL",
]);
export const monetaryWalletTypeEnum = loyaltySchema.enum("monetary_wallet_type", [
  "CASHBACK",
  "STORE_CREDIT",
]);
export const monetaryWalletStatusEnum = loyaltySchema.enum("monetary_wallet_status", [
  "ACTIVE",
  "SUSPENDED",
  "CLOSED",
  "MERGED",
]);
export const monetaryBalanceBucketEnum = loyaltySchema.enum("monetary_balance_bucket", [
  "PENDING",
  "AVAILABLE",
  "RESERVED",
  "DEBT",
]);
export const monetaryTransactionKindEnum = loyaltySchema.enum("monetary_transaction_kind", [
  "EARN_PENDING",
  "ACTIVATE",
  "RESERVE",
  "RELEASE",
  "SPEND",
  "EXPIRE",
  "REVERSE_EARN",
  "RESTORE_SPEND",
  "ADJUST_CREDIT",
  "ADJUST_DEBIT",
  "MERGE_TRANSFER",
  "DEBT_RECOVERY",
]);
