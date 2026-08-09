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
export type LoyaltyProgramVersionStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "ACTIVE"
  | "RETIRED";
export type LoyaltyRoundingMode = "DOWN" | "NEAREST" | "UP";
export type LoyaltyRefundPolicy = "PROPORTIONAL" | "FULL_REVERSAL";
export type LoyaltyDebtPolicy = "TRACK_DEBT" | "REJECT_REVERSAL";
export type LoyaltyRestoredPointsExpiryPolicy =
  | "ORIGINAL_EXPIRY"
  | "RESET_FROM_RESTORE";
export type LoyaltyEligibleSpendBasis =
  | "AFTER_PRODUCT_DISCOUNTS"
  | "AFTER_ALL_DISCOUNTS";
export type LoyaltyModifierStackingMode = "HIGHEST" | "ADD" | "MULTIPLY";
export type LoyaltySegmentMatchMode = "ANY" | "ALL";
export type LoyaltyAccountStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "CLOSED"
  | "MERGED";
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
  | "ORDER"
  | "CHECKOUT"
  | "REFUND"
  | "EXPIRATION"
  | "ADMIN"
  | "MERGE"
  | "IMPORT"
  | "SYSTEM";
export type LoyaltyActorType = "ADMIN_USER" | "CUSTOMER" | "SERVICE" | "SYSTEM";
export type LoyaltyLotAllocationType = "REDEEM" | "EXPIRE" | "REVERSE" | "MERGE";
export type LoyaltyReservationStatus =
  | "ACTIVE"
  | "COMMITTED"
  | "RELEASED"
  | "EXPIRED"
  | "REVERSED";
export type LoyaltyReservationEventType =
  | "CREATED"
  | "COMMITTED"
  | "RELEASED"
  | "EXPIRED"
  | "REVERSED";
export type LoyaltyTierMembershipStatus = "ACTIVE" | "EXPIRED" | "REVOKED";
export type LoyaltyTierMembershipEventType =
  | "QUALIFIED"
  | "UPGRADED"
  | "DOWNGRADED"
  | "RENEWED"
  | "EXPIRED"
  | "REVOKED";

export type LoyaltyCatalogSelector =
  | Readonly<{ type: "ALL"; ids: readonly [] }>
  | Readonly<{
      type: "PRODUCT" | "VARIANT" | "CATEGORY" | "TAG" | "FEATURE" | "OPTION_VALUE";
      ids: readonly string[];
    }>;

export interface LoyaltyProgramEligibilityV1 {
  channelCodes: readonly string[];
  segmentMatchMode: LoyaltySegmentMatchMode;
  segmentIds: readonly string[];
  excludedSegmentIds: readonly string[];
}

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

export interface LoyaltyCalculationSnapshotV1 {
  schemaVersion: 1;
  programVersionId: string;
  orderId: string;
  orderRevision: number;
  currencyCode: string;
  eligibleAmountMinor: string;
  basePoints: string;
  modifierIds: readonly string[];
  multiplierBps: number;
  roundingMode: LoyaltyRoundingMode;
  awardedPoints: string;
}

export interface LoyaltyProgramContract {
  id: string;
  storeId: string;
  code: string;
  name: string;
  status: LoyaltyProgramStatus;
  isDefault: boolean;
  defaultCurrencyCode: string;
  pointsSingular: string;
  pointsPlural: string;
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
  accountId: string;
  checkoutId: string;
  checkoutVersion: number;
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
  qualificationPoints: string | null;
  qualificationSpend: LoyaltyMoney | null;
  benefits: LoyaltyJsonObject;
  createdAt: string;
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
