/** JSON values persisted in versioned policy and audit snapshots. */
export type LoyaltyJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly LoyaltyJsonValue[]
  | { readonly [key: string]: LoyaltyJsonValue };

export type LoyaltyJsonObject = Readonly<Record<string, LoyaltyJsonValue>>;

export interface LoyaltyMoney {
  /** Integer minor units serialized as a decimal string. */
  amountMinor: string;
  currencyCode: string;
}

export type LoyaltyProgramStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
export type LoyaltyProgramVersionStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "RETIRED";
export type LoyaltyRoundingMode = "DOWN" | "NEAREST" | "UP";
export type LoyaltyRefundPolicy = "PROPORTIONAL" | "FULL_REVERSAL";
export type LoyaltyDebtPolicy = "TRACK_DEBT" | "REJECT_REVERSAL";
export type LoyaltyRestoredPointsExpiryPolicy = "ORIGINAL_EXPIRY" | "RESET_FROM_RESTORE";
export type LoyaltyEligibleSpendBasis = "AFTER_PRODUCT_DISCOUNTS" | "AFTER_ALL_DISCOUNTS";
export type LoyaltyModifierStackingMode = "HIGHEST" | "ADD" | "MULTIPLY";
export type LoyaltyProgramEligibilityType = "ALL" | "SEGMENTS";
export type LoyaltySegmentMatchMode = "ANY" | "ALL";
export type LoyaltyAccountStatus = "ACTIVE" | "SUSPENDED" | "CLOSED" | "MERGED";
export type LoyaltyBalanceBucket = "PENDING" | "AVAILABLE" | "RESERVED" | "DEBT";
export type LoyaltyTransactionKind =
  | "EARN_PENDING"
  | "ACTIVATE"
  | "RESERVE"
  | "RELEASE"
  | "REDEEM"
  | "EXPIRE"
  | "REVERSE_EARN"
  | "RESTORE_REDEEM"
  | "ADJUST_CREDIT"
  | "ADJUST_DEBIT"
  | "MERGE_TRANSFER"
  | "DEBT_RECOVERY";
export type LoyaltyTransactionSource =
  "ORDER" | "CHECKOUT" | "REFUND" | "EXPIRATION" | "ADMIN" | "MERGE" | "IMPORT" | "SYSTEM";
export type LoyaltyActorType = "ADMIN_USER" | "CUSTOMER" | "SERVICE" | "SYSTEM";
export type LoyaltyLotAllocationType = "REDEEM" | "EXPIRE" | "REVERSE" | "MERGE";
export type LoyaltyReservationStatus = "ACTIVE" | "COMMITTED" | "RELEASED" | "EXPIRED" | "REVERSED";
export type LoyaltyReservationEventType =
  "CREATED" | "COMMITTED" | "RELEASED" | "EXPIRED" | "REVERSED";
export type LoyaltyTierMembershipStatus = "ACTIVE" | "EXPIRED" | "REVOKED";
export type LoyaltyTierMembershipEventType =
  "QUALIFIED" | "UPGRADED" | "DOWNGRADED" | "RENEWED" | "EXPIRED" | "REVOKED";
export type LoyaltyEarningTriggerType =
  | "ORDER"
  | "SIGNUP"
  | "REVIEW"
  | "REFERRAL"
  | "BIRTHDAY"
  | "ANNIVERSARY"
  | "LOGIN"
  | "SUBSCRIPTION_RENEWAL"
  | "CUSTOM_EVENT";
export type LoyaltyEarningActionType =
  | "AWARD_FIXED_POINTS"
  | "AWARD_SPEND_RATIO"
  | "AWARD_CASHBACK"
  | "APPLY_MULTIPLIER"
  | "ISSUE_REWARD";
export type LoyaltyRewardType =
  | "POINTS"
  | "VOUCHER"
  | "FIXED_DISCOUNT"
  | "PERCENTAGE_DISCOUNT"
  | "FREE_SHIPPING"
  | "FREE_PRODUCT"
  | "MEMBER_BENEFIT"
  | "MONETARY_CREDIT";
export type LoyaltyRewardEntitlementStatus =
  "ISSUED" | "RESERVED" | "REDEEMED" | "EXPIRED" | "REVOKED";
export type LoyaltyTierEvaluationWindowType = "LIFETIME" | "ROLLING" | "CALENDAR";
export type LoyaltyTierCalendarPeriod = "MONTH" | "QUARTER" | "YEAR" | "PROGRAM_YEAR";
export type LoyaltyTierDowngradePolicy = "IMMEDIATE" | "GRACE_PERIOD" | "END_OF_MEMBERSHIP";
export type LoyaltyTierRequalificationPolicy = "AUTOMATIC" | "MANUAL";
export type LoyaltyMonetaryWalletType = "CASHBACK" | "STORE_CREDIT";
export type LoyaltyMonetaryWalletStatus = "ACTIVE" | "SUSPENDED" | "CLOSED" | "MERGED";
export type LoyaltyMonetaryTransactionKind =
  | "EARN_PENDING"
  | "ACTIVATE"
  | "RESERVE"
  | "RELEASE"
  | "SPEND"
  | "EXPIRE"
  | "REVERSE_EARN"
  | "RESTORE_SPEND"
  | "ADJUST_CREDIT"
  | "ADJUST_DEBIT"
  | "MERGE_TRANSFER"
  | "DEBT_RECOVERY";

export type LoyaltyConditionExpressionV1 =
  | Readonly<{
      type: "ALL" | "ANY";
      conditions: readonly LoyaltyConditionExpressionV1[];
    }>
  | Readonly<{ type: "NOT"; condition: LoyaltyConditionExpressionV1 }>
  | Readonly<{
      type: "SEGMENT";
      match: "ANY" | "ALL";
      segmentIds: readonly string[];
    }>
  | Readonly<{ type: "CHANNEL"; channelCodes: readonly string[] }>
  | Readonly<{ type: "CATALOG"; selector: LoyaltyCatalogSelector }>
  | Readonly<{ type: "PAYMENT_METHOD"; paymentMethodCodes: readonly string[] }>
  | Readonly<{ type: "FIRST_PURCHASE" }>
  | Readonly<{ type: "SCHEDULE"; startsAt: string | null; endsAt: string | null }>
  | Readonly<{
      type: "EVENT_FIELD";
      path: readonly string[];
      operator: "EQ" | "NE" | "IN" | "GTE" | "GT" | "LTE" | "LT";
      value: LoyaltyJsonValue;
    }>;

export type LoyaltyEarningActionV1 =
  | Readonly<{ type: "AWARD_FIXED_POINTS"; points: string }>
  | Readonly<{
      type: "AWARD_SPEND_RATIO";
      points: string;
      amountMinor: string;
    }>
  | Readonly<{
      type: "AWARD_CASHBACK";
      basisPoints: number;
      settlement: "POINTS" | "MONETARY";
      currencyCode: string | null;
    }>
  | Readonly<{ type: "APPLY_MULTIPLIER"; multiplierBps: number }>
  | Readonly<{ type: "ISSUE_REWARD"; rewardDefinitionCode: string }>;

export interface LoyaltyEarningLimitWindowV1 {
  type: "LIFETIME" | "DAY" | "WEEK" | "MONTH" | "ROLLING";
  rollingWindowSeconds: number | null;
}

export interface LoyaltyEarningLimitsV1 {
  startsAt: string | null;
  endsAt: string | null;
  perEventMaxPoints: string | null;
  perAccount: Readonly<{
    maxOccurrences: string | null;
    maxPoints: string | null;
    window: LoyaltyEarningLimitWindowV1;
  }> | null;
  campaign: Readonly<{
    maxOccurrences: string | null;
    maxPoints: string | null;
    maxMonetaryMinorByCurrency: Readonly<Record<string, string>>;
  }> | null;
}

export type LoyaltyTierMetricExpressionV1 =
  | Readonly<{
      type: "ALL" | "ANY";
      expressions: readonly LoyaltyTierMetricExpressionV1[];
    }>
  | Readonly<{ type: "NOT"; expression: LoyaltyTierMetricExpressionV1 }>
  | Readonly<{
      type: "METRIC";
      metric: "QUALIFYING_POINTS" | "NET_SPEND_MINOR" | "ORDER_COUNT" | "REFERRAL_COUNT" | "CUSTOM";
      customMetricCode: string | null;
      operator: "GTE" | "GT";
      threshold: string;
      currencyCode: string | null;
    }>;

export type LoyaltyCatalogSelector =
  | Readonly<{ type: "ALL"; ids: readonly [] }>
  | Readonly<{
      type: "PRODUCT" | "VARIANT" | "CATEGORY" | "TAG" | "FEATURE" | "OPTION_VALUE";
      ids: readonly string[];
    }>;

interface LoyaltyProgramEligibilityBaseV1 {
  channelCodes: readonly string[];
  excludedSegmentIds: readonly string[];
}

export type LoyaltyProgramEligibilityV1 =
  | Readonly<
      LoyaltyProgramEligibilityBaseV1 & {
        type: "ALL";
        segmentIds: readonly [];
      }
    >
  | Readonly<
      LoyaltyProgramEligibilityBaseV1 & {
        type: "SEGMENTS";
        segmentMatchMode: LoyaltySegmentMatchMode;
        segmentIds: readonly string[];
      }
    >;

export interface LoyaltyEarningModifierV1 {
  id: string;
  title: string;
  priority: number;
  multiplierBps: number;
  selector: LoyaltyCatalogSelector;
  segmentIds: readonly string[];
  startsAt: string | null;
  endsAt: string | null;
}

/** Canonical JSON policy stored when rules_schema_version = 1. */
export interface LoyaltyProgramRulesV1 {
  schemaVersion: 1;
  eligibility: LoyaltyProgramEligibilityV1;
  earning: Readonly<{
    eligibleSpendBasis: LoyaltyEligibleSpendBasis;
    excludedSelectors: readonly LoyaltyCatalogSelector[];
    modifierStackingMode: LoyaltyModifierStackingMode;
    modifiers: readonly LoyaltyEarningModifierV1[];
  }>;
}

export interface LoyaltyCalculationLineSnapshotV1 {
  orderLineId: string;
  eligibleAmountMinor: string;
  basePoints: string;
  modifierIds: readonly string[];
  multiplierBps: number;
  roundingMode: LoyaltyRoundingMode;
  awardedPoints: string;
}

export interface LoyaltyCalculationSnapshotV1 {
  schemaVersion: 1;
  programVersionId: string;
  orderId: string;
  orderRevision: number;
  currencyCode: string;
  channelCode: string;
  pricingQuoteId: string;
  pricingQuoteRevision: string;
  customerEligibilityRevision: string;
  segmentIds: readonly string[];
  segmentMembershipRevision: string;
  eligibleAmountMinor: string;
  basePoints: string;
  roundingMode: LoyaltyRoundingMode;
  awardedPoints: string;
  lines: readonly LoyaltyCalculationLineSnapshotV1[];
}

export interface LoyaltyProgramContract {
  id: string;
  storeId: string;
  code: string;
  name: string;
  status: LoyaltyProgramStatus;
  isDefault: boolean;
  defaultCurrencyCode: string;
  revision: number;
  metadata: LoyaltyJsonObject;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface LoyaltyProgramVersionContract {
  id: string;
  storeId: string;
  programId: string;
  version: number;
  status: LoyaltyProgramVersionStatus;
  revision: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  earningEnabled: boolean;
  redemptionEnabled: boolean;
  activationDelaySeconds: number;
  pointsExpiryDays: number | null;
  earnPoints: string;
  earnAmountMinor: string;
  minimumEligibleAmountMinor: string;
  redeemPoints: string;
  redeemAmountMinor: string;
  minimumRedeemPoints: string;
  maximumRedeemPointsPerOrder: string | null;
  maximumOrderPercentageBps: number;
  roundingMode: LoyaltyRoundingMode;
  refundPolicy: LoyaltyRefundPolicy;
  debtPolicy: LoyaltyDebtPolicy;
  restoredPointsExpiryPolicy: LoyaltyRestoredPointsExpiryPolicy;
  rulesSchemaVersion: 1;
  rules: LoyaltyProgramRulesV1;
  createdById: string | null;
  publishedById: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface LoyaltyBalanceContract {
  accountId: string;
  pendingPoints: string;
  availablePoints: string;
  reservedPoints: string;
  debtPoints: string;
  lifetimeEarnedPoints: string;
  lifetimeRedeemedPoints: string;
  lifetimeExpiredPoints: string;
  lifetimeAdjustedPoints: string;
  revision: number;
  updatedAt: string;
}

export interface LoyaltyAccountContract {
  id: string;
  storeId: string;
  programId: string;
  customerId: string;
  status: LoyaltyAccountStatus;
  revision: number;
  mergedIntoAccountId: string | null;
  suspendedReason: string | null;
  openedAt: string;
  suspendedAt: string | null;
  closedAt: string | null;
  balance: LoyaltyBalanceContract;
}

export interface LoyaltyTransactionContract {
  id: string;
  storeId: string;
  accountId: string;
  programId: string;
  programVersionId: string | null;
  kind: LoyaltyTransactionKind;
  source: LoyaltyTransactionSource;
  sourceId: string | null;
  sourceRevision: string | null;
  idempotencyKey: string;
  requestHash: string;
  correlationId: string | null;
  causationId: string | null;
  eventId: string | null;
  workflowId: string | null;
  actorType: LoyaltyActorType;
  actorId: string | null;
  reasonCode: string;
  description: string | null;
  occurredAt: string;
  effectiveAt: string;
  metadata: LoyaltyJsonObject;
  createdAt: string;
}

export interface LoyaltyLedgerEntryContract {
  id: string;
  storeId: string;
  transactionId: string;
  accountId: string;
  bucket: LoyaltyBalanceBucket;
  pointsDelta: string;
  sequence: number;
  createdAt: string;
}

export interface LoyaltyPointLotContract {
  id: string;
  storeId: string;
  programId: string;
  accountId: string;
  originEntryId: string;
  pointsIssued: string;
  activatedAt: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface LoyaltyLotAllocationContract {
  id: string;
  storeId: string;
  lotId: string;
  debitEntryId: string;
  transactionId: string;
  allocationType: LoyaltyLotAllocationType;
  points: string;
  createdAt: string;
}

export interface LoyaltyReservationContract {
  id: string;
  storeId: string;
  programId: string;
  programVersionId: string;
  accountId: string;
  checkoutId: string;
  quoteId: string;
  quoteRevision: string;
  points: string;
  discount: LoyaltyMoney;
  status: LoyaltyReservationStatus;
  idempotencyKey: string;
  requestHash: string;
  expiresAt: string;
  orderId: string | null;
  orderRevision: number | null;
  committedAt: string | null;
  releasedAt: string | null;
  reversedAt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyReservationEventContract {
  id: string;
  storeId: string;
  reservationId: string;
  eventType: LoyaltyReservationEventType;
  previousStatus: LoyaltyReservationStatus | null;
  status: LoyaltyReservationStatus;
  transactionId: string;
  eventId: string | null;
  idempotencyKey: string;
  reasonCode: string;
  actorType: LoyaltyActorType;
  actorId: string | null;
  occurredAt: string;
  metadata: LoyaltyJsonObject;
  createdAt: string;
}

export interface LoyaltyTierContract {
  id: string;
  storeId: string;
  programVersionId: string;
  code: string;
  name: string;
  rank: number;
  qualificationSchemaVersion: number;
  qualification: LoyaltyTierMetricExpressionV1;
  maintenance: LoyaltyTierMetricExpressionV1 | null;
  createdAt: string;
}

export interface LoyaltyTierPolicyContract {
  id: string;
  storeId: string;
  programVersionId: string;
  windowType: LoyaltyTierEvaluationWindowType;
  rollingWindowDays: number | null;
  calendarPeriod: LoyaltyTierCalendarPeriod | null;
  programYearStartsMonth: number | null;
  membershipDurationDays: number | null;
  gracePeriodDays: number;
  downgradePolicy: LoyaltyTierDowngradePolicy;
  requalificationPolicy: LoyaltyTierRequalificationPolicy;
  metricSchemaVersion: number;
  createdAt: string;
}

export interface LoyaltyEarningRuleContract {
  id: string;
  storeId: string;
  programVersionId: string;
  code: string;
  name: string;
  priority: number;
  triggerType: LoyaltyEarningTriggerType;
  triggerSchemaVersion: number;
  triggerConfig: LoyaltyJsonObject;
  conditionSchemaVersion: number;
  conditions: LoyaltyConditionExpressionV1;
  actionType: LoyaltyEarningActionType;
  actionSchemaVersion: number;
  action: LoyaltyEarningActionV1;
  limitSchemaVersion: number;
  limits: LoyaltyEarningLimitsV1;
  stopProcessing: boolean;
  createdAt: string;
}

export interface LoyaltyRewardDefinitionContract {
  id: string;
  storeId: string;
  programVersionId: string;
  code: string;
  name: string;
  rewardType: LoyaltyRewardType;
  configurationSchemaVersion: number;
  configuration: LoyaltyJsonObject;
  validityDays: number | null;
  startsAt: string | null;
  endsAt: string | null;
  issuanceLimit: string | null;
  perAccountLimit: string | null;
  createdAt: string;
}

export interface LoyaltyEventFactContract {
  id: string;
  storeId: string;
  producer: string;
  externalEventId: string;
  eventType: string;
  subjectType: string;
  subjectId: string;
  customerId: string | null;
  occurredAt: string;
  payloadSchemaVersion: number;
  payloadHash: string;
  payload: LoyaltyJsonObject;
  receivedAt: string;
}

export interface LoyaltyRewardEntitlementContract {
  id: string;
  storeId: string;
  rewardDefinitionId: string;
  accountId: string;
  sourceEventFactId: string | null;
  issuanceTransactionId: string | null;
  monetaryTransactionId: string | null;
  status: LoyaltyRewardEntitlementStatus;
  configurationSchemaVersion: number;
  configurationSnapshot: LoyaltyJsonObject;
  quantity: string;
  validFrom: string;
  validTo: string | null;
  externalReference: string | null;
  revision: number;
}

export interface LoyaltyMonetaryWalletContract {
  id: string;
  storeId: string;
  programId: string;
  accountId: string;
  walletType: LoyaltyMonetaryWalletType;
  currencyCode: string;
  status: LoyaltyMonetaryWalletStatus;
  mergedIntoWalletId: string | null;
  revision: number;
  openedAt: string;
  closedAt: string | null;
  updatedAt: string;
}

export interface LoyaltyTierMembershipContract {
  id: string;
  storeId: string;
  accountId: string;
  tierId: string;
  status: LoyaltyTierMembershipStatus;
  evaluationPeriodStartedAt: string;
  evaluationPeriodEndedAt: string;
  qualifiedAt: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyTierMembershipEventContract {
  id: string;
  storeId: string;
  accountId: string;
  membershipId: string;
  previousTierId: string | null;
  tierId: string;
  eventType: LoyaltyTierMembershipEventType;
  evaluationRevision: string;
  reasonCode: string;
  occurredAt: string;
  metadata: LoyaltyJsonObject;
  createdAt: string;
}
