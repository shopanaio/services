export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  eventId: string;
  eventType: TType;
  timestamp: string;
  source: string;
  payload: TPayload;
  emitKey: string;
  parentWorkflowId?: string;
  context: EventContext;
  subject: { type: string; id: string };
  actor?: { type: "user" | "service" | "system"; id?: string };
}

export type EmitDispatchOptions =
  | { mode?: "immediate" }
  | {
      mode: "deferred";
      batchKey: string;
      aggregateKey?: string;
    };

export interface EventContext {
  tenantId: string;
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
      tenantId: string;
      eventId: string;
    }
  | {
      kind: "batch";
      tenantId: string;
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
      revision?: number;
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
  /** New revision after update (for optimistic locking) */
  revision: number;
  reasons: ProductUpdatedReason[];
}

export interface ProductUpdatedEvent
  extends DomainEvent<"productUpdated", ProductUpdatedPayload> {}

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
  | FacetCreatedEvent
  | FacetUpdatedEvent
  | FacetDeletedEvent
  | VariantDeletedEvent
  | OrderCreatedEvent
  | OrderCompletedEvent
  | StoreCreatedEvent
  | StoreDeletedEvent
  | FileHardDeletedEvent;

export type EventType = ShopanaEvent["eventType"];
