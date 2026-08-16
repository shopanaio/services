/**
 * Loyalty-owned contracts used by Customers projections and Checkout.
 *
 * Checkout owns orchestration and persists the returned immutable snapshots.
 * Loyalty exclusively owns point balances, conversion policy, reservations,
 * lot allocation, and redemption lifecycle.
 */

export const LoyaltyActionNames = {
  getCustomerAccount: "getCustomerLoyaltyAccount",
} as const;

export const LoyaltyActions = {
  getCustomerAccount: `loyalty.${LoyaltyActionNames.getCustomerAccount}`,
} as const;

export const LoyaltyCheckoutActionNames = {
  quoteRedemption: "quoteCheckoutLoyaltyRedemption",
  reserveRedemption: "reserveCheckoutLoyaltyRedemption",
  commitRedemption: "commitCheckoutLoyaltyRedemption",
  releaseRedemption: "releaseCheckoutLoyaltyRedemption",
  expireRedemptions: "expireCheckoutLoyaltyRedemptions",
  reverseRedemption: "reverseCheckoutLoyaltyRedemption",
  quoteReward: "quoteCheckoutLoyaltyReward",
  reserveReward: "reserveCheckoutLoyaltyReward",
  commitReward: "commitCheckoutLoyaltyReward",
  releaseReward: "releaseCheckoutLoyaltyReward",
} as const;

export const LoyaltyCheckoutActions = {
  quoteRedemption:
    `loyalty.${LoyaltyCheckoutActionNames.quoteRedemption}`,
  reserveRedemption:
    `loyalty.${LoyaltyCheckoutActionNames.reserveRedemption}`,
  commitRedemption:
    `loyalty.${LoyaltyCheckoutActionNames.commitRedemption}`,
  releaseRedemption:
    `loyalty.${LoyaltyCheckoutActionNames.releaseRedemption}`,
  expireRedemptions:
    `loyalty.${LoyaltyCheckoutActionNames.expireRedemptions}`,
  reverseRedemption:
    `loyalty.${LoyaltyCheckoutActionNames.reverseRedemption}`,
  quoteReward: `loyalty.${LoyaltyCheckoutActionNames.quoteReward}`,
  reserveReward: `loyalty.${LoyaltyCheckoutActionNames.reserveReward}`,
  commitReward: `loyalty.${LoyaltyCheckoutActionNames.commitReward}`,
  releaseReward: `loyalty.${LoyaltyCheckoutActionNames.releaseReward}`,
} as const;

export interface LoyaltyRewardQuote {
  entitlementId: string;
  entitlementRevision: number;
  accountId: string;
  rewardDefinitionId: string;
  rewardType: "POINTS" | "VOUCHER" | "FIXED_DISCOUNT" | "PERCENTAGE_DISCOUNT" | "FREE_SHIPPING" | "FREE_PRODUCT" | "MEMBER_BENEFIT" | "MONETARY_CREDIT";
  pricingDiscountId: string;
  externalReference: string | null;
  configuration: Readonly<Record<string, unknown>>;
  expiresAt: string | null;
  revision: string;
}

export interface QuoteCheckoutLoyaltyRewardParams {
  context: LoyaltyCheckoutContext;
  entitlementId: string;
  appliedDiscountIds: readonly string[];
}

export type QuoteCheckoutLoyaltyRewardResult =
  | Readonly<{ status: "QUOTED"; quote: LoyaltyRewardQuote }>
  | Readonly<{ status: "REJECTED"; code: string; message: string; retryable: boolean }>;

export interface ReserveCheckoutLoyaltyRewardParams {
  storeId: string;
  checkoutId: string;
  customerId: string;
  quote: LoyaltyRewardQuote;
  reservedAt: string;
  idempotencyKey: string;
}

export type ReserveCheckoutLoyaltyRewardResult =
  | Readonly<{ status: "RESERVED"; entitlementId: string; entitlementRevision: number }>
  | Readonly<{ status: "REJECTED"; code: string; message: string; retryable: boolean }>;

export interface CommitCheckoutLoyaltyRewardParams {
  storeId: string;
  checkoutId: string;
  entitlementId: string;
  orderId: string;
  externalReference?: string | null;
  committedAt: string;
  idempotencyKey: string;
}

export interface ReleaseCheckoutLoyaltyRewardParams {
  storeId: string;
  checkoutId: string;
  entitlementId: string;
  releasedAt: string;
  idempotencyKey: string;
}

export type TransitionCheckoutLoyaltyRewardResult =
  | Readonly<{ status: "COMMITTED" | "RELEASED" | "NOOP"; entitlementId: string; entitlementRevision: number }>
  | Readonly<{ status: "REJECTED"; code: string; message: string; retryable: boolean }>;

export interface LoyaltyCheckoutMoney {
  amountMinor: string;
  currencyCode: string;
}

export interface LoyaltyProgramSnapshot {
  programId: string;
  programCode: string;
  programVersionId: string;
  programVersion: number;
  programRevision: number;
  currencyCode: string;
  redemptionEnabled: boolean;
  redeemPoints: string;
  redeemAmountMinor: string;
  minimumRedeemPoints: string;
  maximumRedeemPointsPerOrder: string | null;
  maximumOrderPercentageBps: number;
  policyRevision: string;
}

export interface LoyaltyAccountBalanceSnapshot {
  pendingPoints: string;
  availablePoints: string;
  reservedPoints: string;
  debtPoints: string;
  expiringPoints: string;
  nextExpiryAt: string | null;
  revision: number;
}

export interface LoyaltyAccountSnapshot {
  accountId: string;
  storeId: string;
  customerId: string;
  status: "ACTIVE" | "SUSPENDED" | "CLOSED" | "MERGED";
  program: LoyaltyProgramSnapshot;
  balance: LoyaltyAccountBalanceSnapshot;
  tier:
    | Readonly<{
        tierId: string;
        code: string;
        name: string;
        rank: number;
        effectiveFrom: string;
        effectiveTo: string | null;
      }>
    | null;
  revision: string;
}

export interface GetCustomerLoyaltyAccountParams {
  storeId: string;
  customerId: string;
  /** Omit to resolve the store's default active program. */
  programId?: string;
  effectiveAt: string;
}

export type GetCustomerLoyaltyAccountResult =
  | Readonly<{ found: true; account: LoyaltyAccountSnapshot }>
  | Readonly<{
      found: false;
      code:
        | "PROGRAM_NOT_FOUND"
        | "ACCOUNT_NOT_FOUND"
        | "CUSTOMER_NOT_ELIGIBLE";
      retryable: false;
    }>;

export interface LoyaltyCheckoutContext {
  executionId: string;
  checkoutId: string;
  checkoutVersion: number;
  storeId: string;
  customerId: string | null;
  currencyCode: string;
  channelCode: string;
  effectiveAt: string;
  requestedAt: string;
  deadlineAt: string;
  correlationId: string;
  /** Final Pricing quote before loyalty tender is applied. */
  pricingQuoteId: string;
  pricingQuoteRevision: string;
  payableBeforeLoyalty: LoyaltyCheckoutMoney;
  customerEligibilityRevision: string;
  segmentIds: readonly string[];
  segmentMembershipRevision: string;
}

export interface QuoteCheckoutLoyaltyRedemptionParams {
  context: LoyaltyCheckoutContext;
  /** Null requests the maximum allowed by balance and policy. */
  requestedPoints: string | null;
  /** Omit to resolve the default active store program. */
  programId?: string;
}

export interface LoyaltyRedemptionQuote {
  quoteId: string;
  revision: string;
  accountId: string;
  accountRevision: number;
  program: LoyaltyProgramSnapshot;
  requestedPoints: string | null;
  redeemablePoints: string;
  discount: LoyaltyCheckoutMoney;
  payableAfterLoyalty: LoyaltyCheckoutMoney;
  availablePoints: string;
  expiresAt: string;
  basedOnCheckoutVersion: number;
  basedOnPricingQuoteRevision: string;
  basedOnCustomerEligibilityRevision: string;
}

export type LoyaltyRedemptionIneligibilityCode =
  | "CHANNEL_NOT_ELIGIBLE"
  | "REQUIRED_SEGMENT_MISSING"
  | "EXCLUDED_SEGMENT_MATCHED";

export type LoyaltyRedemptionRejectionCode =
  | "CUSTOMER_REQUIRED"
  | "PROGRAM_NOT_FOUND"
  | "PROGRAM_INACTIVE"
  | "REDEMPTION_DISABLED"
  | "ACCOUNT_NOT_FOUND"
  | "ACCOUNT_NOT_ACTIVE"
  | "CURRENCY_MISMATCH"
  | "NO_AVAILABLE_POINTS"
  | "BELOW_MINIMUM_REDEMPTION"
  | "REQUEST_EXCEEDS_AVAILABLE_POINTS"
  | "REQUEST_EXCEEDS_ORDER_LIMIT"
  | "STALE_PRICING_QUOTE"
  | "STALE_CUSTOMER_ELIGIBILITY"
  | "DEADLINE_EXCEEDED";

export type QuoteCheckoutLoyaltyRedemptionResult =
  | Readonly<{ status: "QUOTED"; quote: LoyaltyRedemptionQuote }>
  | Readonly<{
      status: "NOT_APPLICABLE";
      code:
        | "CUSTOMER_REQUIRED"
        | "PROGRAM_NOT_FOUND"
        | "NO_AVAILABLE_POINTS"
        | LoyaltyRedemptionIneligibilityCode;
      retryable: false;
    }>
  | Readonly<{
      status: "REJECTED";
      code: LoyaltyRedemptionRejectionCode;
      message: string;
      retryable: boolean;
    }>;

export interface ReserveCheckoutLoyaltyRedemptionParams {
  context: LoyaltyCheckoutContext;
  quote: LoyaltyRedemptionQuote;
  idempotencyKey: string;
  requestHash: string;
}

export type ReserveCheckoutLoyaltyRedemptionResult =
  | Readonly<{
      status: "RESERVED";
      reservationId: string;
      transactionId: string;
      accountId: string;
      points: string;
      discount: LoyaltyCheckoutMoney;
      expiresAt: string;
      reservationRevision: number;
    }>
  | Readonly<{
      status: "REJECTED";
      code:
        | "QUOTE_EXPIRED"
        | "QUOTE_MISMATCH"
        | "ACCOUNT_NOT_ACTIVE"
        | "INSUFFICIENT_AVAILABLE_POINTS"
        | "CONCURRENT_BALANCE_CHANGE"
        | "IDEMPOTENCY_CONFLICT";
      message: string;
      retryable: boolean;
    }>;

export interface CommitCheckoutLoyaltyRedemptionParams {
  storeId: string;
  checkoutId: string;
  checkoutVersion: number;
  reservationId: string;
  quoteId: string;
  quoteRevision: string;
  orderId: string;
  orderRevision: number;
  committedAt: string;
  idempotencyKey: string;
  requestHash: string;
}

export type CommitCheckoutLoyaltyRedemptionResult =
  | Readonly<{
      status: "COMMITTED";
      reservationId: string;
      redemptionTransactionId: string;
      points: string;
      discount: LoyaltyCheckoutMoney;
      committedAt: string;
    }>
  | Readonly<{
      status: "REJECTED";
      code:
        | "RESERVATION_NOT_FOUND"
        | "RESERVATION_EXPIRED"
        | "RESERVATION_NOT_ACTIVE"
        | "CHECKOUT_MISMATCH"
        | "QUOTE_MISMATCH"
        | "IDEMPOTENCY_CONFLICT";
      message: string;
      retryable: boolean;
    }>;

export interface ReleaseCheckoutLoyaltyRedemptionParams {
  storeId: string;
  checkoutId: string;
  reservationId: string;
  reason:
    | "CHECKOUT_CHANGED"
    | "CHECKOUT_CANCELLED"
    | "ORDER_FAILED"
    | "PAYMENT_FAILED"
    | "CUSTOMER_REQUEST"
    | "ADMIN_REQUEST";
  releasedAt: string;
  idempotencyKey: string;
  requestHash: string;
}

export type ReleaseCheckoutLoyaltyRedemptionResult =
  | Readonly<{
      status: "RELEASED";
      reservationId: string;
      releaseTransactionId: string;
      points: string;
      releasedAt: string;
    }>
  | Readonly<{
      status: "NOOP";
      reservationId: string;
      currentStatus: "RELEASED" | "EXPIRED" | "REVERSED";
    }>
  | Readonly<{
      status: "REJECTED";
      code:
        | "RESERVATION_NOT_FOUND"
        | "RESERVATION_COMMITTED"
        | "IDEMPOTENCY_CONFLICT";
      message: string;
      retryable: boolean;
    }>;

export interface ExpireCheckoutLoyaltyRedemptionsParams {
  storeId: string;
  effectiveAt: string;
  limit?: number;
}

export interface ExpireCheckoutLoyaltyRedemptionsResult {
  expired: readonly Readonly<{
    reservationId: string;
    releaseTransactionId: string;
    points: string;
  }>[];
  hasMore: boolean;
}

export interface ReverseCheckoutLoyaltyRedemptionParams {
  storeId: string;
  reservationId: string;
  orderId: string;
  orderRevision: number;
  refundId: string;
  refundRevision: number;
  /** Exact points restored for this refund allocation. */
  points: string;
  occurredAt: string;
  idempotencyKey: string;
  requestHash: string;
}

export type ReverseCheckoutLoyaltyRedemptionResult =
  | Readonly<{
      status: "REVERSED";
      reservationId: string;
      restoreTransactionId: string;
      points: string;
      availablePoints: string;
    }>
  | Readonly<{
      status: "REJECTED";
      code:
        | "RESERVATION_NOT_FOUND"
        | "RESERVATION_NOT_COMMITTED"
        | "ORDER_MISMATCH"
        | "REVERSAL_EXCEEDS_REDEMPTION"
        | "IDEMPOTENCY_CONFLICT";
      message: string;
      retryable: boolean;
    }>;
