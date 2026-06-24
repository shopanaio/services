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

export interface EventDispatchResult {
  eventId: string;
  eventType: string;
  status: "completed";
  servicesNotified: number;
  results: HandlerInvocationResult[];
}

export interface HandlerInvocationResult {
  service: string;
  status: "success" | "failed";
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
    }
  > {}

/**
 * Payload for productUpdated event.
 * Uses partial snapshot pattern - only contains fields that changed.
 */
export interface ProductUpdatedPayload {
  productId: string;
  storeId: string;
  /** New revision after update (for optimistic locking) */
  revision: number;
  /** Product-level changes (only modified fields) */
  product?: ProductFieldChanges;
  /** Variant-level changes (only modified variants) */
  variants?: Record<string, VariantFieldChanges>;
}

export interface ProductFieldChanges {
  handle?: string;
  title?: string;
  vendorId?: string | null;
  status?: "draft" | "published";
  content?: { description?: string | null; excerpt?: string | null };
  seo?: { title?: string | null; description?: string | null };
  media?: { fileIds: string[] };
  categories?: ProductCategoryFieldChanges;
  tags?: ProductTagFieldChanges;
}

export interface ProductCategoryFieldChanges {
  changed: true;
  reason: "assignment" | "categoryFields" | "rank";
  categoryIds?: string[];
}

export interface ProductTagFieldChanges {
  changed: true;
  reason: "assignment";
  tagIds?: string[];
}

export interface VariantFieldChanges {
  pricing?: { currency: string; amount: number; compareAt?: number | null };
  inventory?: {
    warehouseId: string;
    onHand: number;
    unavailable: number;
    sku?: string | null;
    weight?: number | null;
    unitCostMinor?: number | null;
    costCurrency?: string | null;
  };
  physical?: { width?: number; height?: number; length?: number; weight?: number };
  media?: { fileIds: string[] };
  options?: Array<{ optionId: string; valueId: string }>;
}

export interface ProductUpdatedEvent
  extends DomainEvent<"productUpdated", ProductUpdatedPayload> {}

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
  | OrderCreatedEvent
  | OrderCompletedEvent
  | StoreCreatedEvent
  | StoreDeletedEvent
  | FileHardDeletedEvent;

export type EventType = ShopanaEvent["eventType"];
