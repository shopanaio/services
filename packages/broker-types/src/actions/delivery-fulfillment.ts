import type {
  DeliveryCheckoutMethodType,
  DeliveryProviderContact,
  DeliveryProviderDestination,
  DeliveryProviderOrigin,
  DeliveryProviderPackage,
} from "./delivery.js";
import type { PricingCheckoutJsonObject, PricingCheckoutMoney } from "./pricing.js";

export type DeliveryFulfillmentOrderStatus =
  "CANCELLED" | "CLOSED" | "IN_PROGRESS" | "INCOMPLETE" | "ON_HOLD" | "OPEN" | "SCHEDULED";

export type DeliveryFulfillmentOrderRequestStatus =
  | "ACCEPTED"
  | "CANCELLATION_ACCEPTED"
  | "CANCELLATION_REJECTED"
  | "CANCELLATION_REQUESTED"
  | "CLOSED"
  | "REJECTED"
  | "SUBMITTED"
  | "UNSUBMITTED";

export type DeliveryFulfillmentOrderSupportedAction =
  | "ACCEPT_FULFILLMENT_REQUEST"
  | "ACCEPT_CANCELLATION_REQUEST"
  | "CLOSE"
  | "CREATE_SHIPMENT"
  | "HOLD"
  | "MARK_INCOMPLETE"
  | "MERGE"
  | "MOVE"
  | "REJECT_FULFILLMENT_REQUEST"
  | "REJECT_CANCELLATION_REQUEST"
  | "RELEASE_HOLD"
  | "SUBMIT_CANCELLATION_REQUEST"
  | "SUBMIT_FULFILLMENT_REQUEST";

/** Orders-owned allocation fact consumed by Delivery; Delivery never reallocates it. */
export interface DeliveryFulfillmentOrderLineItemSnapshot {
  fulfillmentOrderLineItemId: string;
  orderLineId: string;
  checkoutLineId: string;
  variantId: string;
  quantity: number;
  remainingQuantity: number;
  requiresShipping: boolean;
}

export type DeliveryFulfillmentOrderAssignedLocation =
  | Readonly<{
      locationId: string;
      management: "MERCHANT";
      fulfillmentService: null;
    }>
  | Readonly<{
      locationId: string;
      management: "FULFILLMENT_SERVICE";
      fulfillmentService: Readonly<{
        fulfillmentServiceId: string;
        appInstallationId: string;
      }>;
    }>;

export interface DeliveryFulfillmentOrderHoldSnapshot {
  holdId: string;
  reason:
    | "AWAITING_PAYMENT"
    | "HIGH_RISK_OF_FRAUD"
    | "INCORRECT_ADDRESS"
    | "INVENTORY_OUT_OF_STOCK"
    | "OTHER";
  reasonNotes: string | null;
  heldAt: string;
}

interface DeliveryCommittedMethodSnapshotBase {
  commitmentId: string;
  committedAt: string;
  deliveryRevision: string;
  methodDefinitionId: string;
  code: string;
  presentedName: string;
  methodType: Exclude<DeliveryCheckoutMethodType, "NONE">;
  cost: PricingCheckoutMoney;
  estimatedMinDeliveryAt: string | null;
  estimatedMaxDeliveryAt: string | null;
  ratedFactsHash: string;
  /** Checkout handle is retained only for audit and is never resolved after order creation. */
  originalOptionHandle: string;
  customerInput: PricingCheckoutJsonObject | null;
  customerInputHash: string | null;
  additionalInformation: PricingCheckoutJsonObject | null;
}

/** Immutable checkout selection copied into Orders before the checkout binding can expire. */
export type DeliveryCommittedMethodSnapshot =
  | Readonly<
      DeliveryCommittedMethodSnapshotBase & {
        source: "MANUAL";
        serviceCode: string;
        carrierServiceAccountId: null;
        carrierCode: null;
        carrierServiceConfigurationRevision: null;
        quoteRevision: null;
      }
    >
  | Readonly<
      DeliveryCommittedMethodSnapshotBase & {
        source: "CARRIER_SERVICE";
        serviceCode: string;
        carrierServiceAccountId: string;
        carrierCode: string;
        carrierServiceConfigurationRevision: string;
        quoteRevision: string;
      }
    >;

/** Orders creates this automatically after routing; each fulfillment order has one assigned location. */
export interface DeliveryFulfillmentOrderSnapshot {
  fulfillmentOrderId: string;
  revision: number;
  organizationId: string;
  storeId: string;
  orderId: string;
  checkoutId: string;
  deliveryGroupId: string;
  status: DeliveryFulfillmentOrderStatus;
  requestStatus: DeliveryFulfillmentOrderRequestStatus;
  supportedActions: readonly DeliveryFulfillmentOrderSupportedAction[];
  assignedLocation: DeliveryFulfillmentOrderAssignedLocation;
  holds: readonly DeliveryFulfillmentOrderHoldSnapshot[];
  deliveryMethod: DeliveryCommittedMethodSnapshot | null;
  lineItems: readonly [
    DeliveryFulfillmentOrderLineItemSnapshot,
    ...DeliveryFulfillmentOrderLineItemSnapshot[],
  ];
  fulfillAt: string | null;
  fulfillBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Trusted packing result used to create a Fulfillment for one fulfillment order. */
export interface DeliveryShipmentPlanSnapshot {
  fulfillmentOrder: DeliveryFulfillmentOrderSnapshot;
  /** Exact subset reserved for this shipment; supports multiple partial shipments. */
  lineItems: readonly [
    DeliveryFulfillmentOrderLineItemInput,
    ...DeliveryFulfillmentOrderLineItemInput[],
  ];
  /** Optional carrier/label integration selected for the assigned location. */
  shipmentProvider: Readonly<{
    providerAccountId: string;
    configurationRevision: string;
  }> | null;
  origin: DeliveryProviderOrigin;
  destination: DeliveryProviderDestination;
  sender: DeliveryProviderContact;
  recipient: DeliveryProviderContact;
  packages: readonly [DeliveryProviderPackage, ...DeliveryProviderPackage[]];
  planHash: string;
}

export type DeliveryShipmentPlanAvailability =
  | Readonly<{
      status: "READY";
      plan: DeliveryShipmentPlanSnapshot;
    }>
  | Readonly<{
      status: "NOT_READY";
      reason:
        | "SCHEDULED"
        | "ON_HOLD"
        | "FULFILLMENT_REQUEST_NOT_ACCEPTED"
        | "NO_SHIPPING_REQUIRED"
        | "CLOSED"
        | "INVALID_LINE_ITEMS"
        | "REVISION_CONFLICT";
      code: string;
      message: string;
      currentRevision: number;
    }>;

export interface DeliveryFulfillmentOrderLineItemInput {
  fulfillmentOrderLineItemId: string;
  quantity: number;
}

export interface DeliveryIncomingRequestLineItemInput {
  fulfillmentOrderLineItemId: string;
  message: string | null;
}

export type DeliveryFulfillmentOrderRejectionReason =
  | "INCORRECT_ADDRESS"
  | "INCORRECT_PRODUCT_INFO"
  | "INELIGIBLE_PRODUCT"
  | "INTERNATIONAL_SHIPPING_UNAVAILABLE"
  | "INVALID_CONTACT_INFORMATION"
  | "INVALID_SKU"
  | "INVENTORY_OUT_OF_STOCK"
  | "MERCHANT_BLOCKED_OR_SUSPENDED"
  | "MISSING_CUSTOMS_INFO"
  | "ORDER_TOO_LARGE"
  | "OTHER"
  | "PACKAGE_PREFERENCE_NOT_SET"
  | "PAYMENT_DECLINED"
  | "UNDELIVERABLE_DESTINATION";

export type DeliveryFulfillmentOrderMutationResult =
  | Readonly<{
      status: "APPLIED" | "DUPLICATE";
      fulfillmentOrder: DeliveryFulfillmentOrderSnapshot;
    }>
  | Readonly<{
      status: "REVISION_CONFLICT" | "INVALID_TRANSITION";
      code: string;
      message: string;
      fulfillmentOrder: DeliveryFulfillmentOrderSnapshot;
    }>;

/** Shopify-compatible payload for a request that can split a fulfillment order. */
export type DeliverySubmitFulfillmentRequestResult =
  | Readonly<{
      status: "APPLIED" | "DUPLICATE";
      originalFulfillmentOrder: DeliveryFulfillmentOrderSnapshot;
      submittedFulfillmentOrder: DeliveryFulfillmentOrderSnapshot;
      unsubmittedFulfillmentOrder: DeliveryFulfillmentOrderSnapshot | null;
    }>
  | Readonly<{
      status: "REVISION_CONFLICT" | "INVALID_TRANSITION";
      code: string;
      message: string;
      originalFulfillmentOrder: DeliveryFulfillmentOrderSnapshot;
      submittedFulfillmentOrder: null;
      unsubmittedFulfillmentOrder: null;
    }>;

export type DeliveryMoveFulfillmentOrderResult =
  | Readonly<{
      status: "APPLIED" | "DUPLICATE";
      originalFulfillmentOrder: DeliveryFulfillmentOrderSnapshot;
      movedFulfillmentOrder: DeliveryFulfillmentOrderSnapshot;
      remainingFulfillmentOrder: DeliveryFulfillmentOrderSnapshot | null;
    }>
  | Readonly<{
      status: "REVISION_CONFLICT" | "INVALID_TRANSITION";
      code: string;
      message: string;
      originalFulfillmentOrder: DeliveryFulfillmentOrderSnapshot;
      movedFulfillmentOrder: null;
      remainingFulfillmentOrder: null;
    }>;

export type DeliveryMergeFulfillmentOrdersResult =
  | Readonly<{
      status: "APPLIED" | "DUPLICATE";
      originalFulfillmentOrders: readonly [
        DeliveryFulfillmentOrderSnapshot,
        DeliveryFulfillmentOrderSnapshot,
        ...DeliveryFulfillmentOrderSnapshot[],
      ];
      mergedFulfillmentOrder: DeliveryFulfillmentOrderSnapshot;
    }>
  | Readonly<{
      status: "REVISION_CONFLICT" | "INVALID_TRANSITION";
      code: string;
      message: string;
      originalFulfillmentOrders: readonly DeliveryFulfillmentOrderSnapshot[];
      mergedFulfillmentOrder: null;
    }>;

export interface DeliveryFulfillmentShipmentUpdate {
  fulfillmentOrderId: string;
  expectedFulfillmentOrderRevision: number;
  shipmentId: string;
  shipmentRevision: number;
  /** Immutable shipment allocation; state determines whether Orders consumes or releases it. */
  lineItems: readonly [
    DeliveryFulfillmentOrderLineItemInput,
    ...DeliveryFulfillmentOrderLineItemInput[],
  ];
  state: "SHIPMENT_CREATED" | "IN_TRANSIT" | "DELIVERED" | "DELIVERY_FAILED" | "CANCELLED";
  occurredAt: string;
}
