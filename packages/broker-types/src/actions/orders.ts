export const OrderReviewActionNames = {
  verifyPurchase: "verifyReviewPurchase",
} as const;

export const OrderLoyaltyActionNames = {
  publishEligible: "publishLoyaltyRewardEligible",
  publishReversed: "publishLoyaltyRewardReversed",
} as const;

export const OrderLoyaltyActions = {
  publishEligible: `order.${OrderLoyaltyActionNames.publishEligible}`,
  publishReversed: `order.${OrderLoyaltyActionNames.publishReversed}`,
} as const;

/**
 * Immutable purchase facts captured by Checkout and owned by Orders after the
 * order is created. Orders persists this snapshot before it can publish an
 * earning event, so payment retries never hydrate mutable Catalog or Customers
 * state.
 */
export interface OrderLoyaltyRewardEligibilitySnapshot {
  customerId: string;
  currencyCode: string;
  channelCode: string;
  customerEligibilityRevision: string;
  segmentIds: readonly string[];
  segmentMembershipRevision: string;
  eligibleAmountAfterProductDiscountsMinor: string;
  eligibleAmountAfterAllDiscountsMinor: string;
  pricingQuoteId: string;
  pricingQuoteRevision: string;
  lines: readonly Readonly<{
    orderLineId: string;
    productId: string;
    variantId: string;
    categoryIds: readonly string[];
    tagIds: readonly string[];
    featureIds: readonly string[];
    optionValueIds: readonly string[];
    quantity: number;
    eligibleAmountAfterProductDiscountsMinor: string;
    eligibleAmountAfterAllDiscountsMinor: string;
  }>[];
}

export interface PublishOrderLoyaltyRewardEligibleParams {
  organizationId: string;
  storeId: string;
  orderId: string;
  orderRevision: number;
  eligibleAt: string;
  correlationId: string;
}

export type PublishOrderLoyaltyRewardEligibleResult =
  | Readonly<{ published: true; eventId: string }>
  | Readonly<{ published: false; code: "CUSTOMER_NOT_ELIGIBLE" }>;

export interface PublishOrderLoyaltyRewardReversedParams {
  organizationId: string;
  storeId: string;
  orderId: string;
  orderRevision: number;
  customerId: string;
  currencyCode: string;
  sourceType: "REFUND" | "CANCELLATION" | "ORDER_CORRECTION";
  sourceId: string;
  sourceRevision: number;
  eligibleAmountAfterProductDiscountsMinor: string;
  eligibleAmountAfterAllDiscountsMinor: string;
  reversedAt: string;
  correlationId: string;
  lines: readonly Readonly<{
    orderLineId: string;
    quantity: number;
    eligibleAmountAfterProductDiscountsMinor: string;
    eligibleAmountAfterAllDiscountsMinor: string;
  }>[];
}

export interface PublishOrderLoyaltyRewardReversedResult {
  published: true;
  eventId: string;
}

export const OrderReviewActions = {
  verifyPurchase: `order.${OrderReviewActionNames.verifyPurchase}`,
} as const;

export interface VerifyReviewPurchaseParams {
  storeId: string;
  customerId: string;
  orderId: string;
  orderLineId: string;
  productId: string;
  variantId: string | null;
}

export type VerifyReviewPurchaseResult =
  | {
      eligible: true;
      verificationMethod: "ORDER_LINE";
    }
  | {
      eligible: false;
      code:
        | "ORDER_NOT_FOUND"
        | "ORDER_NOT_ELIGIBLE"
        | "ORDER_CUSTOMER_MISMATCH"
        | "ORDER_LINE_NOT_FOUND"
        | "ORDER_LINE_PRODUCT_MISMATCH"
        | "ORDER_LINE_VARIANT_MISMATCH";
    };
