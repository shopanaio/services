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
  /**
   * Itemised duty breakdown captured from checkout; omitted or empty when the
   * line carries no duty. The aggregate stays in `duty`, so Orders persists
   * detail rows only for the titles the producer actually resolved.
   */
  dutyLines?: readonly OrderPlacementDutyLineV1[];
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
  /** Delivery-specific tax breakdown captured from checkout; omitted or empty when none. */
  deliveryTaxLines?: readonly OrderPlacementTaxLineV1[];
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

export interface OrderPlacementDutyLineV1 {
  title: string;
  countryCode: string | null;
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

/**
 * Store-level return policy captured by Checkout at order placement. Orders
 * stores the snapshot verbatim and later derives return eligibility from it,
 * mirroring Shopify's immutable policy-snapshot model. `null` means the store
 * has no configured policy, and Orders then applies no policy restriction.
 */
export interface OrderReturnPolicySnapshotV1 {
  policyId: string;
  revision: string;
  /**
   * Return window in calendar days counted from the moment the returned goods
   * reach the customer. Orders uses the latest delivered shipment, or the
   * successful fulfilment completion time when no shipment exists. The window
   * does not start from placement. `null` means unlimited after receipt.
   */
  timeframeDays: number | null;
  /** Restocking fee as a percentage string, e.g. "10.00"; null means none. */
  restockingFeePercentage: string | null;
  /**
   * Reason codes a return request may use. An empty list means the policy does
   * not restrict reasons.
   */
  allowedReasons: readonly string[];
  /** When true, only finalized (closed) orders are returnable. */
  finalizedOrdersOnly: boolean;
  capturedAt: string;
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
  returnPolicy: OrderReturnPolicySnapshotV1 | null;
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

export const OrderProviderActionNames = {
  completeFulfillmentServiceOperation: "completeOrderFulfillmentServiceOperationV1",
  applyIntegrationEvent: "applyOrderIntegrationEventV1",
  applyIntegrationImport: "applyOrderIntegrationImportV1",
} as const;

export const OrderProviderActions = {
  completeFulfillmentServiceOperation: `order.${OrderProviderActionNames.completeFulfillmentServiceOperation}`,
  applyIntegrationEvent: `order.${OrderProviderActionNames.applyIntegrationEvent}`,
  applyIntegrationImport: `order.${OrderProviderActionNames.applyIntegrationImport}`,
} as const;

export interface CompleteOrderFulfillmentServiceOperationV1Params {
  contractVersion: 1;
  operationId: string;
  providerEventId: string;
  providerSequence: number | null;
  status: "ACCEPTED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  externalId: string;
  externalRevision: string | null;
  occurredAt: string;
  payload: Readonly<Record<string, unknown>>;
}

export interface CompleteOrderFulfillmentServiceOperationV1Result {
  orderId: string;
  fulfillmentOrderId: string;
  orderVersion: number;
  duplicate: boolean;
}

export interface ApplyOrderIntegrationEventV1Params {
  contractVersion: 1;
  integrationLinkId: string;
  providerEventId: string;
  externalOrderId: string;
  externalRevision: string;
  eventType: "SYNC_ACKNOWLEDGED" | "EXTERNAL_CHANGED" | "EXTERNAL_DELETED";
  occurredAt: string;
  payload: Readonly<Record<string, unknown>>;
}

export interface ApplyOrderIntegrationEventV1Result {
  orderId: string;
  integrationLinkId: string;
  orderVersion: number;
  duplicate: boolean;
  reconciliationRequired: boolean;
}

/**
 * Canonical inbound order facts a channel app translates from its external
 * system and pushes to Orders. Orders applies these to the local order,
 * keeping the channel app (not a generic platform importer) as the owner of
 * the external-to-canonical mapping — the Shopify reconciliation model.
 *
 * Every field is a canonical platform value, never a provider-native one, and
 * every `null` means "the app has no fact to report", not "reset the value".
 * Orders rejects state that requires domain side effects (cancellation,
 * refunds, restock); those must go through the corresponding order command.
 */
export interface OrderIntegrationImportSnapshotV1 {
  schemaVersion: 1;
  /** Reconcilable lifecycle state; `CANCELLED` is rejected on purpose. */
  status: "OPEN" | "CLOSED" | null;
  paymentStatus: OrderIntegrationImportPaymentStatusV1 | null;
  fulfillmentStatus: OrderIntegrationImportFulfillmentStatusV1 | null;
  deliveryStatus: OrderIntegrationImportDeliveryStatusV1 | null;
  lineQuantities: readonly Readonly<{ orderLineId: string; quantity: number }>[] | null;
  tags: readonly string[] | null;
  externalOrderId: string;
  externalRevision: string;
  observedAt: string;
}

export type OrderIntegrationImportPaymentStatusV1 =
  | "NOT_REQUIRED"
  | "PENDING"
  | "AUTHORIZED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "VOIDED"
  | "EXPIRED"
  | "FAILED";

export type OrderIntegrationImportFulfillmentStatusV1 =
  "UNFULFILLED" | "SCHEDULED" | "ON_HOLD" | "PARTIALLY_FULFILLED" | "FULFILLED" | "CANCELLED";

export type OrderIntegrationImportDeliveryStatusV1 =
  | "NOT_SHIPPED"
  | "PARTIALLY_SHIPPED"
  | "SHIPPED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DELIVERY_ATTEMPTED"
  | "DELAYED"
  | "EXCEPTION"
  | "RETURNED_TO_SENDER"
  | "CANCELLED";

export interface ApplyOrderIntegrationImportV1Params {
  contractVersion: 1;
  integrationLinkId: string;
  providerEventId: string;
  import: OrderIntegrationImportSnapshotV1;
  idempotencyKey: string;
  correlationId: string;
}

export interface ApplyOrderIntegrationImportV1Result {
  orderId: string;
  integrationLinkId: string;
  orderVersion: number;
  duplicate: boolean;
}

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

/**
 * Customer-scoped post-order actions. Orders verifies ownership
 * (order.customerId === customerId) under the same row lock as the mutation
 * and reuses the same domain logic as the admin commands, mirroring Shopify's
 * customer self-service model. `expectedVersion` is the revision the customer
 * observed: the command fails with a version conflict when the order moved on.
 */
export const OrderStorefrontActionNames = {
  cancel: "cancelOrderFromStorefront",
  createReturnRequest: "createOrderReturnRequestFromStorefront",
} as const;

export const OrderStorefrontActions = {
  cancel: `order.${OrderStorefrontActionNames.cancel}`,
  createReturnRequest: `order.${OrderStorefrontActionNames.createReturnRequest}`,
} as const;

export interface CancelOrderFromStorefrontParams {
  organizationId: string;
  storeId: string;
  customerId: string;
  orderId: string;

  reasonCode: string | null;
  idempotencyKey: string;
  correlationId: string;
}

export interface CancelOrderFromStorefrontResult {
  orderId: string;
  orderVersion: number;
  orderStatus: "CANCELLED";
  duplicate: boolean;
}

export interface CreateOrderReturnRequestFromStorefrontParams {
  organizationId: string;
  storeId: string;
  customerId: string;
  orderId: string;

  lines: readonly Readonly<{
    orderLineId: string;
    quantity: number;
    reasonCode: string;
    note?: string;
  }>[];
  idempotencyKey: string;
  correlationId: string;
}

export interface CreateOrderReturnRequestFromStorefrontResult {
  orderId: string;
  returnRequestId: string;
  orderVersion: number;
  duplicate: boolean;
}
