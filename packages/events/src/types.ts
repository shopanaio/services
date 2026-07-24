export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  eventId: string;
  eventType: TType;
  /**
   * Monotonic sequence within organizationId + subject.type + subject.id.
   * Assigned by the events service when the event is persisted.
   */
  eventSequence?: number;
  timestamp: string;
  source: string;
  payload: TPayload;
  emitKey: string;
  parentWorkflowId?: string;
  context: EventContext;
  subject: { type: string; id: string };
  actor?: { type: "user" | "service" | "system"; id?: string };
}

export interface NotificationRecipientSnapshot {
  recipientId?: string;
  customerId?: string;
  userId?: string;
  email?: string;
  phone?: string;
  locale?: string;
  name?: string;
}

export interface NotificationSnapshot<TData = Record<string, unknown>> {
  storeId: string;
  locale?: string;
  recipients?: readonly NotificationRecipientSnapshot[];
  data: TData;
}

export interface OrderCreatedNotificationData {
  order: {
    id: string;
    number: string;
    statusUrl?: string;
    currencyCode: string;
    totalAmount: number;
    createdAt: string;
  };
  customer?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  items?: ReadonlyArray<{
    title: string;
    quantity: number;
    unitAmount: number;
    lineAmount: number;
  }>;
  store: {
    id: string;
    displayName: string;
    defaultLocale: string;
    timezone: string;
  };
}

export type NotificationEventType =
  | "draftOrderInvoiceRequested"
  | "orderFulfilled"
  | "localPickupReady"
  | "localPickupCompleted"
  | "localDeliveryStarted"
  | "localDeliveryCompleted"
  | "localDeliveryMissed"
  | "giftCardIssued"
  | "giftCardRecipientAssigned"
  | "storeCreditIssued"
  | "orderInvoiceRequested"
  | "orderEdited"
  | "orderCancelled"
  | "orderPaymentReceiptRequested"
  | "orderRefunded"
  | "checkoutAbandoned"
  | "orderStatusLinkRequested"
  | "checkoutPaymentFailed"
  | "pendingPaymentFailed"
  | "pendingPaymentSucceeded"
  | "paymentReminderDue"
  | "posCheckoutAbandoned"
  | "posCartEmailRequested"
  | "posReceiptRequested"
  | "posExchangeReceiptRequested"
  | "shippingTrackingUpdated"
  | "shipmentOutForDelivery"
  | "shipmentDelivered"
  | "returnCreated"
  | "returnLabelCreated"
  | "returnRequestReceived"
  | "returnRequestApproved"
  | "returnRequestDeclined"
  | "orderChangeRequestReceived"
  | "cancellationRequestDeclined"
  | "customerAccountActivated"
  | "b2bAccessGranted"
  | "customerNewLoginDetected"
  | "orderSalesAttributionEdited"
  | "draftOrderSubmitted";

export type NotificationDomainEvent<
  TType extends NotificationEventType = NotificationEventType,
  TData extends Record<string, unknown> = Record<string, unknown>,
> = DomainEvent<
  TType,
  {
    storeId: string;
    notification: NotificationSnapshot<TData>;
  } & Record<string, unknown>
>;

export type EmitDispatchOptions =
  | { mode?: "immediate" }
  | {
      mode: "deferred";
      batchKey: string;
      aggregateKey?: string;
    };

export interface EventContext {
  organizationId: string;
  userId?: string;
  correlationId: string;
  causationId?: string;
}

/**
 * Response from an event handler.
 * Uses unified OperationResult pattern with retryable error classification.
 */
export type EventHandlerResponse<T = void> =
  | { success: true; data?: T }
  | { success: false; error: { message: string; code?: string; retryable: boolean } };

export type EventBatchHandlerResponse<T = void> =
  | { success: true; data?: T }
  | {
      success: false;
      error: { message: string; code?: string; retryable: boolean };
      failedEventIds?: string[];
    };

/**
 * @deprecated Use EventHandlerResponse with success/error pattern
 */
export type LegacyEventHandlerResponse =
  | { ok: true }
  | { ok: false; error: { message: string; code?: string; retryable: boolean } };

export interface HandlerInfo {
  serviceName: string;
  action: string;
  retryPolicy: {
    maxAttempts: number;
    intervalSeconds: number;
    backoffRate: number;
    timeoutMs?: number;
  };
}

export interface EventHandlerDelivery {
  jobId: string;
  attempt: number;
  maxAttempts: number;
  idempotencyKey: string;
}

export interface EventEmitResult {
  eventId: string;
  eventType: string;
  status: "pending";
  dispatchMode: "immediate" | "deferred";
  dispatchWorkflowId?: string;
}

export type EventDispatchInput =
  | {
      kind: "event";
      organizationId: string;
      eventId: string;
    }
  | {
      kind: "batch";
      organizationId: string;
      eventType?: string;
      batchKey: string;
      limit?: number;
    };

export interface EventDispatchResult {
  claimed: number;
  dispatched: number;
  failed: number;
}

export interface HandlerInvocationResult {
  service: string;
  status: "success" | "failed";
  error?: string;
  durationMs: number;
}

export interface BatchHandlerInvocationResult {
  service: string;
  status: "success" | "failed";
  eventIds: string[];
  failedEventIds: string[];
  error?: string;
  durationMs: number;
}

export interface ProductCreatedEvent
  extends DomainEvent<
    "productCreated",
    {
      productId: string;
      storeId: string;
      name: string;
      sku?: string;
    }
  > {}

export interface ProductDeletedEvent
  extends DomainEvent<
    "productDeleted",
    {
      productId: string;
      storeId: string;
      categoryIds?: string[];
      deletedAt?: string;
      entityType?: "product" | "bundle";
    }
  > {}

export type ProductUpdatedReason =
  | "identity"
  | "content"
  | "seo"
  | "status"
  | "media"
  | "category"
  | "tag"
  | "options"
  | "features"
  | "variant"
  | "pricing"
  | "inventory"
  | "physical";

/**
 * Payload for productUpdated event.
 * Carries only update reasons; consumers should hydrate current state when needed.
 */
export interface ProductUpdatedPayload {
  productId: string;
  storeId: string;
  reasons: ProductUpdatedReason[];
}

export interface ProductUpdatedEvent
  extends DomainEvent<"productUpdated", ProductUpdatedPayload> {}

export interface CustomerCreatedEvent
  extends DomainEvent<
    "customerCreated",
    {
      customerId: string;
      storeId: string;
    }
  > {}

export interface CustomerDeletedEvent
  extends DomainEvent<
    "customerDeleted",
    {
      customerId: string;
      storeId: string;
      revision: number;
      deletedAt: string;
    }
  > {}

export type CustomerUpdatedReason =
  | "profile"
  | "contact"
  | "company"
  | "status"
  | "note"
  | "moderation"
  | "address"
  | "consent"
  | "taxIdentifier"
  | "taxExemption"
  | "group"
  | "tag"
  | "segment";

/**
 * Payload for customerUpdated event. Consumers hydrate the current customer
 * state and use reasons to skip unrelated projections.
 */
export interface CustomerUpdatedPayload {
  customerId: string;
  storeId: string;
  reasons: CustomerUpdatedReason[];
}

export interface CustomerUpdatedEvent
  extends DomainEvent<"customerUpdated", CustomerUpdatedPayload> {}

export interface ReviewRatingCriterionCreatedEvent
  extends DomainEvent<
    "reviewRatingCriterionCreated",
    { criterionId: string; storeId: string }
  > {}

export interface ReviewCreatedEvent
  extends DomainEvent<
    "reviewCreated",
    { reviewId: string; storeId: string; productId: string }
  > {}

export interface ProductQuestionCreatedEvent
  extends DomainEvent<
    "productQuestionCreated",
    { productQuestionId: string; storeId: string; productId: string }
  > {}

export interface ReviewRequestCreatedEvent
  extends DomainEvent<
    "reviewRequestCreated",
    { reviewRequestId: string; storeId: string; customerId: string; productId: string }
  > {}

export interface ReviewModerationCaseCreatedEvent
  extends DomainEvent<
    "reviewModerationCaseCreated",
    { moderationCaseId: string; storeId: string; contentId: string }
  > {}

export interface ReviewContentExternalReferenceCreatedEvent
  extends DomainEvent<
    "reviewContentExternalReferenceCreated",
    { externalReferenceId: string; storeId: string; contentId: string }
  > {}

export interface ReviewRatingCriterionDeletedEvent
  extends DomainEvent<
    "reviewRatingCriterionDeleted",
    { criterionId: string; storeId: string; permanent: boolean }
  > {}

export interface ReviewDeletedEvent
  extends DomainEvent<
    "reviewDeleted",
    { reviewId: string; storeId: string; productId: string; permanent: boolean }
  > {}

export interface ProductQuestionDeletedEvent
  extends DomainEvent<
    "productQuestionDeleted",
    { productQuestionId: string; storeId: string; productId: string; permanent: boolean }
  > {}

export interface ReviewContentExternalReferenceDeletedEvent
  extends DomainEvent<
    "reviewContentExternalReferenceDeleted",
    { externalReferenceId: string; storeId: string; contentId: string; permanent: boolean }
  > {}

export interface FacetCreatedEvent
  extends DomainEvent<
    "facetCreated",
    {
      facetId: string;
      storeId: string;
      facetType: string;
      slug: string;
      label: string;
      uiType: string;
      selectionMode: string;
      lexoRank: string;
    }
  > {}

export interface FacetUpdatedPayload {
  facetId: string;
  storeId: string;
  facetType: string;
  facet: {
    slug?: string;
    label?: string;
    uiType?: string;
    selectionMode?: string;
    lexoRank?: string;
  };
}

export interface FacetUpdatedEvent
  extends DomainEvent<"facetUpdated", FacetUpdatedPayload> {}

export interface FacetDeletedEvent
  extends DomainEvent<
    "facetDeleted",
    {
      facetId: string;
      storeId: string;
      facetType: string;
      slug?: string;
    }
  > {}

export interface ListingFacetMembershipChangedEvent
  extends DomainEvent<
    "listingFacetMembershipChanged",
    {
      storeId: string;
      productId: string;
      reason:
        | "facet_created"
        | "facet_deleted"
        | "facet_value_created"
        | "facet_value_updated"
        | "facet_value_deleted"
        | "facet_value_merged"
        | "facet_value_unmerged";
      operationId: string;
      facetIds: string[];
      refsHash: string;
    }
  > {}

export interface VariantDeletedEvent
  extends DomainEvent<
    "variantDeleted",
    {
      variantId: string;
      productId: string;
      storeId: string;
    }
  > {}

export interface OrderCreatedEvent
  extends DomainEvent<
    "orderCreated",
    {
      orderId: string;
      storeId: string;
      customerId: string;
      items: Array<{ productId: string; quantity: number; price: number }>;
      total: number;
      notification: NotificationSnapshot<OrderCreatedNotificationData>;
    }
  > {}

export interface OrderCompletedEvent
  extends DomainEvent<
    "orderCompleted",
    {
      orderId: string;
      storeId: string;
      completedAt: string;
    }
  > {}

export interface StoreCreatedEvent
  extends DomainEvent<
    "storeCreated",
    {
      storeId: string;
      organizationId: string;
      name: string;
      displayName: string;
      defaultLocale: string;
    }
  > {}

export interface StoreDeletedEvent
  extends DomainEvent<
    "storeDeleted",
    {
      storeId: string;
      organizationId: string;
    }
  > {}

export interface FileHardDeletedEvent
  extends DomainEvent<
    "fileHardDeleted",
    {
      fileId: string;
    }
  > {}

export type ShopanaEvent =
  | ProductCreatedEvent
  | ProductDeletedEvent
  | ProductUpdatedEvent
  | CustomerCreatedEvent
  | CustomerDeletedEvent
  | CustomerUpdatedEvent
  | ReviewRatingCriterionCreatedEvent
  | ReviewCreatedEvent
  | ProductQuestionCreatedEvent
  | ReviewRequestCreatedEvent
  | ReviewModerationCaseCreatedEvent
  | ReviewContentExternalReferenceCreatedEvent
  | ReviewRatingCriterionDeletedEvent
  | ReviewDeletedEvent
  | ProductQuestionDeletedEvent
  | ReviewContentExternalReferenceDeletedEvent
  | FacetCreatedEvent
  | FacetUpdatedEvent
  | FacetDeletedEvent
  | ListingFacetMembershipChangedEvent
  | VariantDeletedEvent
  | OrderCreatedEvent
  | OrderCompletedEvent
  | StoreCreatedEvent
  | StoreDeletedEvent
  | FileHardDeletedEvent
  | NotificationDomainEvent;

export type EventType = ShopanaEvent["eventType"];
