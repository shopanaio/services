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
  { ok: true } | { ok: false; error: { message: string; code?: string; retryable: boolean } };

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

export interface ProductCreatedEvent extends DomainEvent<
  "productCreated",
  {
    productId: string;
    storeId: string;
    name: string;
    sku?: string;
  }
> {}

export interface ProductDeletedEvent extends DomainEvent<
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
  | "component"
  | "variant"
  | "pricing"
  | "inventory"
  | "physical"
  | "collection";

/**
 * Payload for productUpdated event.
 * Carries only update reasons; consumers should hydrate current state when needed.
 */
export interface ProductUpdatedPayload {
  productId: string;
  storeId: string;
  reasons: ProductUpdatedReason[];
}

export interface ProductUpdatedEvent extends DomainEvent<"productUpdated", ProductUpdatedPayload> {}

export type CollectionUpdatedReason =
  "metadata" | "rules" | "publication" | "schedule" | "sort" | "items" | "rank";

export interface CollectionChangedPayload {
  storeId: string;
  collectionId: string;
  revision: number;
  listingRevision: number;
  reasons: CollectionUpdatedReason[];
}

export interface CollectionCreatedEvent extends DomainEvent<
  "collectionCreated",
  CollectionChangedPayload
> {}

export interface CollectionUpdatedEvent extends DomainEvent<
  "collectionUpdated",
  CollectionChangedPayload
> {}

export interface CollectionDeletedEvent extends DomainEvent<
  "collectionDeleted",
  CollectionChangedPayload & { deletedAt: string }
> {}

export interface CustomerCreatedEvent extends DomainEvent<
  "customerCreated",
  {
    customerId: string;
    storeId: string;
  }
> {}

export interface ApplicationUserCreatedEvent extends DomainEvent<
  "applicationUserCreated",
  {
    applicationId: string;
    applicationUserId: string;
  }
> {}

export type ApplicationUserProjectionField =
  "email" | "emailVerified" | "firstName" | "lastName" | "phoneNumber" | "phoneNumberVerified";

/**
 * Signals that an application-local IAM identity projection changed.
 * Consumers hydrate the current IAM snapshot through the protected IAM action;
 * the event intentionally carries no customer PII.
 */
export interface ApplicationUserUpdatedEvent extends DomainEvent<
  "applicationUserUpdated",
  {
    applicationId: string;
    applicationUserId: string;
    changedFields: readonly ApplicationUserProjectionField[];
    updatedAt: string;
  }
> {}

export interface ApplicationUserStatusChangedEvent extends DomainEvent<
  "applicationUserStatusChanged",
  {
    applicationId: string;
    applicationUserId: string;
    previousStatus: "active" | "blocked";
    status: "active" | "blocked";
    changedAt: string;
  }
> {}

export interface ApplicationUserDeletedEvent extends DomainEvent<
  "applicationUserDeleted",
  {
    applicationId: string;
    applicationUserId: string;
    deletedAt: string;
  }
> {}

export interface CustomerDeletedEvent extends DomainEvent<
  "customerDeleted",
  {
    customerId: string;
    storeId: string;
    revision: number;
    deletedAt: string;
  }
> {}

export interface CustomerRedactedEvent extends DomainEvent<
  "customerRedacted",
  {
    customerId: string;
    storeId: string;
    dataRequestId: string;
    revision: number;
    redactedAt: string;
  }
> {}

export interface CustomerDataRequestStatusChangedEvent extends DomainEvent<
  "customerDataRequestStatusChanged",
  {
    dataRequestId: string;
    customerId: string;
    storeId: string;
    requestType: "ACCESS" | "EXPORT" | "CORRECTION" | "ERASURE";
    status: "PROCESSING" | "COMPLETED" | "REJECTED";
    resultFileId?: string | null;
    rejectionReason?: string;
    occurredAt: string;
    notification: NotificationSnapshot<{
      request: {
        id: string;
        type: "ACCESS" | "EXPORT" | "CORRECTION" | "ERASURE";
        status: "PROCESSING" | "COMPLETED" | "REJECTED";
        resultFileId?: string | null;
        rejectionReason?: string;
      };
    }>;
  }
> {}

export interface CustomerMergedEvent extends DomainEvent<
  "customerMerged",
  {
    schemaVersion: 1;
    storeId: string;
    mergeId: string;
    mergeRevision: number;
    sourceCustomerId: string;
    targetCustomerId: string;
    completedAt: string;
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

export interface CustomerUpdatedEvent extends DomainEvent<
  "customerUpdated",
  CustomerUpdatedPayload
> {}

export interface CustomerExternalReferenceCreatedEvent extends DomainEvent<
  "customerExternalReferenceCreated",
  {
    externalReferenceId: string;
    storeId: string;
    customerId: string;
    externalSystem: string;
    externalType: string;
    externalId: string;
  }
> {}

export interface CustomerExternalReferenceReassignedEvent extends DomainEvent<
  "customerExternalReferenceReassigned",
  {
    externalReferenceId: string;
    storeId: string;
    previousCustomerId: string;
    customerId: string;
    externalSystem: string;
    externalType: string;
    externalId: string;
  }
> {}

export interface CustomerExternalReferenceDeletedEvent extends DomainEvent<
  "customerExternalReferenceDeleted",
  {
    externalReferenceId: string;
    storeId: string;
    customerId: string;
    externalSystem: string;
    externalType: string;
    externalId: string;
  }
> {}

export interface ReviewRatingCriterionCreatedEvent extends DomainEvent<
  "reviewRatingCriterionCreated",
  { criterionId: string; storeId: string }
> {}

export interface ReviewCreatedEvent extends DomainEvent<
  "reviewCreated",
  { reviewId: string; storeId: string; productId: string }
> {}

export interface ProductQuestionCreatedEvent extends DomainEvent<
  "productQuestionCreated",
  { productQuestionId: string; storeId: string; productId: string }
> {}

export interface ReviewRequestCreatedEvent extends DomainEvent<
  "reviewRequestCreated",
  { reviewRequestId: string; storeId: string; customerId: string; productId: string }
> {}

export interface ReviewModerationCaseCreatedEvent extends DomainEvent<
  "reviewModerationCaseCreated",
  { moderationCaseId: string; storeId: string; contentId: string }
> {}

export interface ReviewContentExternalReferenceCreatedEvent extends DomainEvent<
  "reviewContentExternalReferenceCreated",
  { externalReferenceId: string; storeId: string; contentId: string }
> {}

export interface ReviewRatingCriterionDeletedEvent extends DomainEvent<
  "reviewRatingCriterionDeleted",
  { criterionId: string; storeId: string; permanent: boolean }
> {}

export interface ReviewDeletedEvent extends DomainEvent<
  "reviewDeleted",
  { reviewId: string; storeId: string; productId: string; permanent: boolean }
> {}

export interface ProductQuestionDeletedEvent extends DomainEvent<
  "productQuestionDeleted",
  { productQuestionId: string; storeId: string; productId: string; permanent: boolean }
> {}

export interface ReviewContentExternalReferenceDeletedEvent extends DomainEvent<
  "reviewContentExternalReferenceDeleted",
  { externalReferenceId: string; storeId: string; contentId: string; permanent: boolean }
> {}

export interface FacetCreatedEvent extends DomainEvent<
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

export interface FacetUpdatedEvent extends DomainEvent<"facetUpdated", FacetUpdatedPayload> {}

export interface FacetDeletedEvent extends DomainEvent<
  "facetDeleted",
  {
    facetId: string;
    storeId: string;
    facetType: string;
    slug?: string;
  }
> {}

export interface ListingFacetMembershipChangedEvent extends DomainEvent<
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

export interface VariantDeletedEvent extends DomainEvent<
  "variantDeleted",
  {
    variantId: string;
    productId: string;
    storeId: string;
  }
> {}

/**
 * Orders-owned immutable earning facts. Loyalty selects the applicable program
 * version and calculates points; Orders never calculates a points amount.
 */
export const OrderRewardEventTypes = {
  eligible: "orderRewardEligible",
  reversed: "orderRewardReversed",
} as const;

export interface OrderRewardEligibleEvent extends DomainEvent<
  "orderRewardEligible",
  {
    schemaVersion: 1;
    orderId: string;
    orderRevision: number;
    storeId: string;
    customerId: string;
    currencyCode: string;
    channelCode: string;
    customerEligibilityRevision: string;
    segmentIds: readonly string[];
    segmentMembershipRevision: string;
    eligibleAmountAfterProductDiscountsMinor: string;
    eligibleAmountAfterAllDiscountsMinor: string;
    eligibleAt: string;
    pricingQuoteId: string;
    pricingQuoteRevision: string;
    lines: readonly {
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
    }[];
  }
> {}

/**
 * Orders-owned correction facts for refunds, cancellation, or an amended order.
 * Each source revision describes only the newly reversed eligible amount.
 */
export interface OrderRewardReversedEvent extends DomainEvent<
  "orderRewardReversed",
  {
    schemaVersion: 1;
    orderId: string;
    orderRevision: number;
    storeId: string;
    customerId: string;
    currencyCode: string;
    sourceType: "REFUND" | "CANCELLATION" | "ORDER_CORRECTION";
    sourceId: string;
    sourceRevision: number;
    eligibleAmountAfterProductDiscountsMinor: string;
    eligibleAmountAfterAllDiscountsMinor: string;
    reversedAt: string;
    lines: readonly {
      orderLineId: string;
      quantity: number;
      eligibleAmountAfterProductDiscountsMinor: string;
      eligibleAmountAfterAllDiscountsMinor: string;
    }[];
  }
> {}

export interface CustomerOrderProjectionPayload {
  schemaVersion: 1;
  orderId: string;
  orderRevision: number;
  storeId: string;
  customerId: string;
  currencyCode: string;
  totalAmountMinor: string;
  createdAt: string;
  occurredAt: string;
}

export interface OrderCreatedEvent extends DomainEvent<
  "orderCreated",
  CustomerOrderProjectionPayload & {
    notification: NotificationSnapshot<OrderCreatedNotificationData>;
  }
> {}

export interface OrderCompletedEvent extends DomainEvent<
  "orderCompleted",
  CustomerOrderProjectionPayload & { completedAt: string }
> {}

export interface OrderCancelledEvent extends DomainEvent<
  "orderCancelled",
  CustomerOrderProjectionPayload & {
    cancelledAt: string;
    notification: NotificationSnapshot<Record<string, unknown>>;
  }
> {}

export interface OrderPlacedEvent extends DomainEvent<
  "orderPlaced",
  {
    schemaVersion: 1;
    organizationId: string;
    storeId: string;
    orderId: string;
    orderVersion: number;
    placementId: string;
    checkoutId: string;
    snapshotHash: string;
    placedAt: string;
  }
> {}

export interface OrderPlacementConfirmedEvent extends DomainEvent<
  "orderPlacementConfirmed",
  {
    schemaVersion: 1;
    organizationId: string;
    storeId: string;
    orderId: string;
    orderVersion: number;
    placementId: string;
    finalizedAt: string;
  }
> {}

export interface OrderPlacementFailedEvent extends DomainEvent<
  "orderPlacementFailed",
  {
    schemaVersion: 1;
    organizationId: string;
    storeId: string;
    orderId: string;
    orderVersion: number;
    placementId: string;
    reasonCode: string;
    failedAt: string;
  }
> {}

export interface OrderRefundedEvent extends DomainEvent<
  "orderRefunded",
  {
    schemaVersion: 1;
    refundId: string;
    refundRevision: number;
    orderId: string;
    orderRevision: number;
    storeId: string;
    customerId: string;
    currencyCode: string;
    refundedAmountMinor: string;
    refundedAt: string;
    notification: NotificationSnapshot<Record<string, unknown>>;
  }
> {}

/**
 * Orders-owned, self-contained confirmed-sale fact used by Listing
 * recommendations. Duplicate product lines are allowed at the transport
 * boundary, but producers must keep both line and aggregate quantities inside
 * signed PostgreSQL integer bounds.
 */
export interface OrderSaleCommittedEvent extends DomainEvent<
  "orderSaleCommitted",
  {
    schemaVersion: 1;
    orderId: string;
    storeId: string;
    orderRevision: number;
    committedAt: string;
    lines: readonly {
      productId: string;
      quantity: number;
    }[];
  }
> {}

/** A complete reversal of the effective confirmed sale generation. */
export interface OrderSaleReversedEvent extends DomainEvent<
  "orderSaleReversed",
  {
    schemaVersion: 1;
    orderId: string;
    storeId: string;
    orderRevision: number;
    committedAt: string;
    reversedAt: string;
  }
> {}

export interface CheckoutCustomerActivityRecordedEvent extends DomainEvent<
  "checkoutCustomerActivityRecorded",
  {
    schemaVersion: 1;
    checkoutId: string;
    storeId: string;
    customerId: string;
    occurredAt: string;
  }
> {}

export interface CustomerStatisticsUpdatedEvent extends DomainEvent<
  "customerStatisticsUpdated",
  {
    schemaVersion: 1;
    storeId: string;
    customerId: string;
    reasons: readonly ("order" | "checkout" | "refund" | "rebuild")[];
    updatedAt: string;
  }
> {}

export interface CustomerLifecycleJobDispatchedEvent extends DomainEvent<
  "customerLifecycleJobDispatched",
  {
    schemaVersion: 1;
    storeId: string;
    jobType: "MERGE" | "DATA_REQUEST";
    aggregateId: string;
    jobId: string;
    dispatchedAt: string;
  }
> {}

export interface CustomerLifecycleJobCompletedEvent extends DomainEvent<
  "customerLifecycleJobCompleted",
  {
    schemaVersion: 1;
    storeId: string;
    jobType: "MERGE" | "DATA_REQUEST";
    aggregateId: string;
    jobId: string;
    outcome: "COMPLETED" | "FAILED" | "REJECTED";
    resolution?: Record<string, unknown>;
    resultFileId?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    completedAt: string;
  }
> {}

export const LoyaltyEventTypes = {
  pointsEarned: "loyaltyPointsEarned",
  pointsActivated: "loyaltyPointsActivated",
  pointsReserved: "loyaltyPointsReserved",
  pointsRedeemed: "loyaltyPointsRedeemed",
  pointsReleased: "loyaltyPointsReleased",
  pointsExpired: "loyaltyPointsExpired",
  pointsReversed: "loyaltyPointsReversed",
  pointsRestored: "loyaltyPointsRestored",
  pointsAdjusted: "loyaltyPointsAdjusted",
} as const;

interface LoyaltyPointsEventPayload<TProgramVersionId extends string | null = string> {
  schemaVersion: 1;
  storeId: string;
  programId: string;
  programVersionId: TProgramVersionId;
  accountId: string;
  customerId: string;
  transactionId: string;
  points: string;
  occurredAt: string;
}

export interface LoyaltyPointsEarnedEvent extends DomainEvent<
  "loyaltyPointsEarned",
  LoyaltyPointsEventPayload & {
    orderId: string;
    orderRevision: number;
    activationAt: string;
    expiresAt: string | null;
  }
> {}

export interface LoyaltyPointsActivatedEvent extends DomainEvent<
  "loyaltyPointsActivated",
  LoyaltyPointsEventPayload & { lotIds: readonly string[] }
> {}

export interface LoyaltyPointsReservedEvent extends DomainEvent<
  "loyaltyPointsReserved",
  LoyaltyPointsEventPayload & {
    reservationId: string;
    checkoutId: string;
    discountAmountMinor: string;
    currencyCode: string;
    expiresAt: string;
  }
> {}

export interface LoyaltyPointsRedeemedEvent extends DomainEvent<
  "loyaltyPointsRedeemed",
  LoyaltyPointsEventPayload & {
    reservationId: string;
    checkoutId: string;
    orderId: string;
    orderRevision: number;
    discountAmountMinor: string;
    currencyCode: string;
  }
> {}

export interface LoyaltyPointsReleasedEvent extends DomainEvent<
  "loyaltyPointsReleased",
  LoyaltyPointsEventPayload & {
    reservationId: string;
    checkoutId: string;
    reasonCode: string;
  }
> {}

export interface LoyaltyPointsExpiredEvent extends DomainEvent<
  "loyaltyPointsExpired",
  LoyaltyPointsEventPayload & { lotIds: readonly string[] }
> {}

export interface LoyaltyPointsReversedEvent extends DomainEvent<
  "loyaltyPointsReversed",
  LoyaltyPointsEventPayload & {
    orderId: string;
    sourceType: "REFUND" | "CANCELLATION" | "ORDER_CORRECTION";
    sourceId: string;
    debtPoints: string;
  }
> {}

export interface LoyaltyPointsRestoredEvent extends DomainEvent<
  "loyaltyPointsRestored",
  LoyaltyPointsEventPayload & {
    reservationId: string;
    orderId: string;
    sourceType: "REFUND" | "CANCELLATION" | "ORDER_CORRECTION";
    sourceId: string;
    expiresAt: string | null;
  }
> {}

export interface LoyaltyPointsAdjustedEvent extends DomainEvent<
  "loyaltyPointsAdjusted",
  LoyaltyPointsEventPayload<string | null> & {
    direction: "CREDIT" | "DEBIT";
    reasonCode: string;
    actorId: string;
  }
> {}

export interface StoreCreatedEvent extends DomainEvent<
  "storeCreated",
  {
    storeId: string;
    organizationId: string;
    name: string;
    displayName: string;
    defaultLocale: string;
  }
> {}

export interface StoreConfigurationUpdatedEvent extends DomainEvent<
  "storeConfigurationUpdated",
  {
    schemaVersion: 1;
    storeId: string;
    configurationRevision: number;
    currencyCode: string;
    timeZone: string;
    occurredAt: string;
  }
> {}

export interface StoreDeletedEvent extends DomainEvent<
  "storeDeleted",
  {
    storeId: string;
    organizationId: string;
  }
> {}

export interface FileHardDeletedEvent extends DomainEvent<
  "fileHardDeleted",
  {
    fileId: string;
  }
> {}

export type ShopanaEvent =
  | ProductCreatedEvent
  | ProductDeletedEvent
  | ProductUpdatedEvent
  | CollectionCreatedEvent
  | CollectionUpdatedEvent
  | CollectionDeletedEvent
  | ApplicationUserCreatedEvent
  | ApplicationUserUpdatedEvent
  | ApplicationUserStatusChangedEvent
  | ApplicationUserDeletedEvent
  | CustomerCreatedEvent
  | CustomerDeletedEvent
  | CustomerRedactedEvent
  | CustomerDataRequestStatusChangedEvent
  | CustomerMergedEvent
  | CustomerUpdatedEvent
  | CustomerExternalReferenceCreatedEvent
  | CustomerExternalReferenceReassignedEvent
  | CustomerExternalReferenceDeletedEvent
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
  | OrderCancelledEvent
  | OrderPlacedEvent
  | OrderPlacementConfirmedEvent
  | OrderPlacementFailedEvent
  | OrderRefundedEvent
  | OrderSaleCommittedEvent
  | OrderSaleReversedEvent
  | CheckoutCustomerActivityRecordedEvent
  | CustomerStatisticsUpdatedEvent
  | CustomerLifecycleJobDispatchedEvent
  | CustomerLifecycleJobCompletedEvent
  | OrderRewardEligibleEvent
  | OrderRewardReversedEvent
  | LoyaltyPointsEarnedEvent
  | LoyaltyPointsActivatedEvent
  | LoyaltyPointsReservedEvent
  | LoyaltyPointsRedeemedEvent
  | LoyaltyPointsReleasedEvent
  | LoyaltyPointsExpiredEvent
  | LoyaltyPointsReversedEvent
  | LoyaltyPointsRestoredEvent
  | LoyaltyPointsAdjustedEvent
  | StoreCreatedEvent
  | StoreConfigurationUpdatedEvent
  | StoreDeletedEvent
  | FileHardDeletedEvent
  | NotificationDomainEvent;

export type EventType = ShopanaEvent["eventType"];
