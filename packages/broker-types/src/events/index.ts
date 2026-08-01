/**
 * Broker event types - organized by service
 *
 * Events are returned from workflows and emitted via runWorkflow.
 */

import type { EntityRef } from "../shared.js";
import type {
  PaymentCustomerAction,
  PaymentCollectionState,
  PaymentDisputeState,
  PaymentFailure,
  PaymentOperationType,
  PaymentPendingReason,
  PaymentProviderRouteSnapshot,
  PaymentSessionKind,
  PaymentSessionState,
  PaymentSettlementConfirmation,
} from "../actions/payments.js";
import type { PricingCheckoutMoney } from "../actions/pricing.js";
import type {
  DeliveryLabelSnapshot,
  DeliveryParcelSnapshot,
  DeliveryProviderFailure,
  DeliveryProviderRouteSnapshot,
  DeliveryShipmentOperationType,
  DeliveryShipmentState,
  DeliveryTrackingEventSnapshot,
} from "../actions/delivery.js";

// ============================================================================
// Media Events
// ============================================================================

export namespace MediaEvents {
  /** Emitted when a file is soft-deleted */
  export interface FileSoftDeleted {
    fileId: string;
    assetGroupId: string;
    deletedAt: string;
  }

  /** Emitted when a file is hard-deleted */
  export interface FileHardDeleted {
    fileId: string;
  }
}

// ============================================================================
// Inventory Events
// ============================================================================

export namespace InventoryEvents {
  /** Emitted when a product is created */
  export interface ProductCreated {
    productId: string;
    storeId: string;
  }

  /** Emitted when a product is deleted */
  export interface ProductDeleted {
    productId: string;
    storeId: string;
    categoryIds?: string[];
  }

  /** Emitted when entity is deleted and needs cleanup */
  export interface EntityDeleted {
    entityRef: EntityRef;
  }
}

// ============================================================================
// IAM Events
// ============================================================================

export namespace IAMEvents {
  /** Emitted when an organization is created */
  export interface OrganizationCreated {
    organizationId: string;
    userId: string;
  }

  /** Emitted when an organization is deleted */
  export interface OrganizationDeleted {
    organizationId: string;
  }
}

// ============================================================================
// Project Events
// ============================================================================

export namespace ProjectEvents {
  /** Emitted when a store is created */
  export interface StoreCreated {
    storeId: string;
    organizationId: string;
    name: string;
    displayName: string;
    defaultLocale: string;
  }

  /** Emitted when a store is deleted */
  export interface StoreDeleted {
    storeId: string;
    organizationId: string;
  }
}

// ============================================================================
// Payments Events
// ============================================================================

export const PaymentEventTypes = {
  collectionStateChanged: "payment.collection.state_changed",
  sessionCreated: "payment.session.created",
  requiresAction: "payment.requires_action",
  requiresConfirmation: "payment.requires_confirmation",
  confirmationCompleted: "payment.confirmation.completed",
  pending: "payment.pending",
  cancelled: "payment.cancelled",
  authorized: "payment.authorized",
  captured: "payment.captured",
  failed: "payment.failed",
  voided: "payment.voided",
  refunded: "payment.refunded",
  expired: "payment.expired",
  disputeChanged: "payment.dispute.changed",
} as const;

export namespace PaymentEvents {
  export interface Base {
    schemaVersion: 1;
    paymentCollectionId: string;
    paymentSessionId: string;
    operationId: string;
    organizationId: string;
    storeId: string;
    checkoutId: string;
    orderId: string;
    operationType: PaymentOperationType;
    providerCode: string;
    route: PaymentProviderRouteSnapshot;
    occurredAt: string;
    sessionRevision: number;
    sessionState: PaymentSessionState;
    sessionAmount: PricingCheckoutMoney;
  }

  export interface CollectionStateChanged {
    schemaVersion: 1;
    paymentCollectionId: string;
    organizationId: string;
    storeId: string;
    checkoutId: string;
    orderId: string;
    previousState: PaymentCollectionState;
    state: PaymentCollectionState;
    targetAmount: PricingCheckoutMoney;
    authorizedAmount: PricingCheckoutMoney;
    capturedAmount: PricingCheckoutMoney;
    refundedAmount: PricingCheckoutMoney;
    outstandingAmount: PricingCheckoutMoney;
    collectionRevision: number;
    occurredAt: string;
  }

  export interface SessionCreated extends Base {
    kind: PaymentSessionKind;
    amount: PricingCheckoutMoney;
    attemptSequence: number;
  }

  export interface RequiresAction extends Base {
    customerAction: PaymentCustomerAction;
    providerReference: string;
  }

  export interface Pending extends Base {
    providerReference: string;
    reason: PaymentPendingReason;
    expiresAt: string;
    nextReconcileAt: string | null;
  }

  export interface RequiresConfirmation extends Base {
    providerReference: string;
    confirmationExpiresAt: string;
  }

  export interface ConfirmationCompleted extends Base {
    providerReference: string;
    confirmation: PaymentSettlementConfirmation;
  }

  export interface Cancelled extends Base {
    providerReference: string | null;
    reason: string | null;
  }

  export interface Authorized extends Base {
    amount: PricingCheckoutMoney;
    providerReference: string;
    networkTransactionId: string | null;
  }

  export interface Captured extends Base {
    amount: PricingCheckoutMoney;
    capturedTotal: PricingCheckoutMoney;
    providerReference: string;
    networkTransactionId: string | null;
    resultingState: "PARTIALLY_CAPTURED" | "CAPTURED";
    remainingCapturableAmount: PricingCheckoutMoney;
  }

  export interface Failed extends Base {
    failure: PaymentFailure;
  }

  export interface Voided extends Base {
    voidedTotal: PricingCheckoutMoney;
    capturedTotal: PricingCheckoutMoney;
    providerReference: string;
    resultingState: "VOIDED" | "PARTIALLY_CAPTURED";
  }

  export interface Refunded extends Base {
    amount: PricingCheckoutMoney;
    refundedTotal: PricingCheckoutMoney;
    providerReference: string;
    resultingState: "PARTIALLY_REFUNDED" | "REFUNDED";
    remainingRefundableAmount: PricingCheckoutMoney;
  }

  export interface Expired extends Base {
    previousState: "PENDING" | "REQUIRES_ACTION" | "REQUIRES_CONFIRMATION";
    reason: string;
  }

  export interface DisputeChanged {
    schemaVersion: 1;
    paymentDisputeId: string;
    paymentCollectionId: string;
    paymentSessionId: string;
    organizationId: string;
    storeId: string;
    orderId: string;
    providerCode: string;
    providerDisputeReference: string;
    providerReference: string;
    amount: PricingCheckoutMoney;
    reasonCode: string;
    previousState: PaymentDisputeState | null;
    state: PaymentDisputeState;
    responseDueAt: string | null;
    disputeRevision: number;
    occurredAt: string;
  }
}

// ============================================================================
// Delivery Events
// ============================================================================

export const DeliveryEventTypes = {
  shipmentCreated: "delivery.shipment.created",
  shipmentStateChanged: "delivery.shipment.state_changed",
  trackingUpdated: "delivery.shipment.tracking_updated",
  labelAvailable: "delivery.shipment.label_available",
  operationFailed: "delivery.shipment.operation_failed",
} as const;

export namespace DeliveryEvents {
  export interface Base {
    schemaVersion: 1;
    eventId: string;
    causationId: string;
    correlationId: string;
    shipmentId: string;
    operationId: string | null;
    organizationId: string;
    storeId: string;
    checkoutId: string;
    orderId: string;
    fulfillmentOrderId: string;
    providerCode: string;
    providerAccountId: string;
    providerShipmentReference: string | null;
    route: Extract<
      DeliveryProviderRouteSnapshot,
      Readonly<{ capability: "delivery.shipment-provider" }>
    >;
    operationType: DeliveryShipmentOperationType | null;
    shipmentRevision: number;
    occurredAt: string;
  }

  export interface ShipmentCreated extends Base {
    shipmentState: DeliveryShipmentState;
    parcels: readonly DeliveryParcelSnapshot[];
  }

  export interface ShipmentStateChanged extends Base {
    previousState: DeliveryShipmentState;
    state: DeliveryShipmentState;
  }

  export interface TrackingUpdated extends Base {
    shipmentState: DeliveryShipmentState;
    event: DeliveryTrackingEventSnapshot;
  }

  export interface LabelAvailable extends Base {
    shipmentState: DeliveryShipmentState;
    parcelId: string;
    providerParcelReference: string | null;
    label: DeliveryLabelSnapshot;
  }

  export interface OperationFailed extends Base {
    shipmentState: DeliveryShipmentState;
    failure: DeliveryProviderFailure;
  }
}
