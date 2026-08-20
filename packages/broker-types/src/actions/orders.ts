import type {
  DeliveryFulfillmentOrderSnapshot,
  DeliveryFulfillmentShipmentUpdate,
  DeliveryShipmentPlanAvailability,
} from "./delivery-fulfillment.js";

export const OrderCheckoutActionNames = {
  createFromPlacement: "createOrderFromCheckoutPlacementV1",
  confirmPlacement: "confirmOrderFromCheckoutPlacementV1",
  cancelPlacement: "cancelOrderFromCheckoutPlacementV1",
  getPlacement: "getOrderCheckoutPlacementV1",
} as const;

export const OrderCheckoutActions = {
  createFromPlacement: `order.${OrderCheckoutActionNames.createFromPlacement}`,
  confirmPlacement: `order.${OrderCheckoutActionNames.confirmPlacement}`,
  cancelPlacement: `order.${OrderCheckoutActionNames.cancelPlacement}`,
  getPlacement: `order.${OrderCheckoutActionNames.getPlacement}`,
} as const;

export interface OrderPlacementMoneyV1 {
  amountMinor: string;
  currencyCode: string;
}

export interface OrderPlacementLineV1 {
  id: string;
  parentLineId: string | null;
  purchasableId: string;
  purchasableType: string;
  title: string;
  sku: string | null;
  imageUrl: string | null;
  quantity: number;
  requiresShipping: boolean;
  taxable: boolean;
  unitPrice: OrderPlacementMoneyV1;
  compareAtUnitPrice: OrderPlacementMoneyV1 | null;
  subtotal: OrderPlacementMoneyV1;
  discount: OrderPlacementMoneyV1;
  tax: OrderPlacementMoneyV1;
  duty: OrderPlacementMoneyV1;
  total: OrderPlacementMoneyV1;
  snapshot: Readonly<Record<string, unknown>>;
}

export interface OrderPlacementCustomerSnapshotV1 {
  customerId: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  email: string | null;
  phone: string | null;
  countryCode: string | null;
}

export interface OrderPlacementAddressV1 {
  id: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  countryCode: string | null;
  provinceCode: string | null;
  postalCode: string | null;
  company: string | null;
  metadata: Readonly<Record<string, unknown>>;
}

export interface OrderPlacementDeliveryGroupV1 {
  id: string;
  lineIds: readonly string[];
  address: OrderPlacementAddressV1 | null;
  recipient: Readonly<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    middleName: string | null;
    email: string | null;
    phone: string | null;
  }> | null;
  selectedMethod: Readonly<{
    code: string;
    provider: string;
    title: string | null;
    type: string;
    paymentModel: string | null;
    quotedAmount: OrderPlacementMoneyV1;
    publicData: Readonly<Record<string, unknown>>;
  }> | null;
}

export interface OrderPlacementDiscountV1 {
  code: string | null;
  title: string;
  provider: string | null;
  targetType: string;
  valueType: "FIXED_AMOUNT" | "PERCENTAGE";
  valueAmount: OrderPlacementMoneyV1 | null;
  valuePercentage: string | null;
  totalAllocatedAmount: OrderPlacementMoneyV1;
  metadata: Readonly<Record<string, unknown>>;
}

export interface OrderPlacementTaxLineV1 {
  title: string;
  rate: string;
  amount: OrderPlacementMoneyV1;
}

export interface OrderPlacementPaymentMethodV1 {
  code: string;
  title: string;
  provider: string;
  flow: string;
  publicData: Readonly<Record<string, unknown>>;
}

export interface OrderPlacementCostV1 {
  subtotal: OrderPlacementMoneyV1;
  discount: OrderPlacementMoneyV1;
  shipping: OrderPlacementMoneyV1;
  tax: OrderPlacementMoneyV1;
  duty: OrderPlacementMoneyV1;
  adjustment: OrderPlacementMoneyV1;
  total: OrderPlacementMoneyV1;
}

export interface OrderPlacementSnapshotV1 {
  capturedAt: string;
  currencyCode: string;
  localeCode: string | null;
  salesChannel: string | null;
  externalSource: string | null;
  externalId: string | null;
  customer: OrderPlacementCustomerSnapshotV1;
  cost: OrderPlacementCostV1;
  lines: readonly OrderPlacementLineV1[];
  discounts: readonly OrderPlacementDiscountV1[];
  taxLines: readonly OrderPlacementTaxLineV1[];
  deliveryGroups: readonly OrderPlacementDeliveryGroupV1[];
  selectedPayment: OrderPlacementPaymentMethodV1 | null;
  customerNote: string | null;
  customFields: Readonly<Record<string, unknown>>;
  loyaltyRewardEligibility: OrderLoyaltyRewardEligibilitySnapshot | null;
}

export interface OrderPlacementLoyaltyCommitmentV1 {
  pointsReservationId: string | null;
  rewardEntitlementId: string | null;
}

export interface OrderPlacementCommitmentsV1 {
  inventory: { reservationKey: string; expiresAt: string };
  pricing: { reservationIds: readonly string[]; redemptionIds: readonly string[] };
  loyalty: OrderPlacementLoyaltyCommitmentV1 | null;
  delivery: readonly Readonly<Record<string, unknown>>[];
}

export interface CreateOrderFromCheckoutPlacementV1Params {
  contractVersion: 1;
  organizationId: string;
  storeId: string;
  placementId: string;
  checkoutId: string;
  checkoutVersion: number;
  resultRevision: string;
  finalQuote: { quoteId: string; revision: string };
  paymentMethodsRevision: string;
  deliveryRevision: string;
  requestedOrderId: string;
  actor: { credentialId: string; userId: string | null; visitorIdHash: string };
  snapshotHash: string;
  snapshot: OrderPlacementSnapshotV1;
  commitments: OrderPlacementCommitmentsV1;
  idempotencyKey: string;
  correlationId: string;
  workflowId: string;
}

export interface CreateOrderFromCheckoutPlacementV1Result {
  orderId: string;
  orderNumber: string;
  orderVersion: number;
  orderStatus: "OPEN";
  placementStatus: "AWAITING_FINALIZATION";
  placedAt: string;
  snapshotHash: string;
  duplicate: boolean;
}

export interface ConfirmOrderFromCheckoutPlacementV1Params {
  contractVersion: 1;
  organizationId: string;
  storeId: string;
  placementId: string;
  orderId: string;
  evidence:
    | { kind: "PAYMENT_NOT_REQUIRED" }
    | {
        kind: "PAYMENT_AUTHORIZED" | "PAYMENT_CAPTURED";
        paymentSessionId: string;
        operationId: string;
      }
    | { kind: "OFFLINE_ACCEPTED" | "ON_DELIVERY_ACCEPTED"; paymentMethodCode: string };
  finalizedAt: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface CancelOrderFromCheckoutPlacementV1Params {
  contractVersion: 1;
  organizationId: string;
  storeId: string;
  placementId: string;
  orderId: string;
  reasonCode: "PAYMENT_FAILED" | "PAYMENT_EXPIRED" | "PAYMENT_CANCELLED" | "PLACEMENT_FAILED";
  paymentSessionId: string | null;
  paymentOperationId: string | null;
  failedAt: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface GetOrderCheckoutPlacementV1Params {
  contractVersion: 1;
  organizationId: string;
  storeId: string;
  placementId: string;
  orderId?: string;
}

export type OrderCheckoutPlacementV1Result = Readonly<{
  orderId: string;
  placementId: string;
  checkoutId: string;
  snapshotHash: string;
  status: "AWAITING_FINALIZATION" | "CONFIRMED" | "FAILED";
  orderStatus: "OPEN" | "CANCELLED";
  orderVersion: number;
}>;

export const OrderFulfillmentActionNames = {
  listForOrder: "listDeliveryFulfillmentOrders",
  getShipmentPlan: "getDeliveryShipmentPlan",
  applyShipmentUpdate: "applyDeliveryShipmentUpdate",
} as const;

export const OrderFulfillmentActions = {
  listForOrder: `order.${OrderFulfillmentActionNames.listForOrder}`,
  getShipmentPlan: `order.${OrderFulfillmentActionNames.getShipmentPlan}`,
  applyShipmentUpdate: `order.${OrderFulfillmentActionNames.applyShipmentUpdate}`,
} as const;

export interface ListOrderDeliveryFulfillmentOrdersParams {
  storeId: string;
  orderId: string;
}

export interface ListOrderDeliveryFulfillmentOrdersResult {
  fulfillmentOrders: readonly DeliveryFulfillmentOrderSnapshot[];
}

export interface GetOrderDeliveryShipmentPlanParams {
  storeId: string;
  fulfillmentOrderId: string;
  expectedFulfillmentOrderRevision: number;
  lineItems:
    | readonly Readonly<{
        fulfillmentOrderLineItemId: string;
        quantity: number;
      }>[]
    | null;
}

export type GetOrderDeliveryShipmentPlanResult = DeliveryShipmentPlanAvailability;

export interface ApplyOrderDeliveryShipmentUpdateParams {
  storeId: string;
  update: DeliveryFulfillmentShipmentUpdate;
}

export type ApplyOrderDeliveryShipmentUpdateResult =
  | Readonly<{ status: "APPLIED" | "DUPLICATE"; fulfillmentOrderRevision: number }>
  | Readonly<{ status: "REVISION_CONFLICT"; fulfillmentOrderRevision: number }>;

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
