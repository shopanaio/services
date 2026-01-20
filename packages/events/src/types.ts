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
  related?: Array<{ type: string; id: string }>;
  actor?: { type: "user" | "service" | "system"; id?: string };
}

export interface EventContext {
  tenantId: string;
  userId?: string;
  correlationId: string;
  causationId?: string;
}

export type EventHandlerResponse =
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
    }
  > {}

export interface ProductUpdatedEvent
  extends DomainEvent<
    "productUpdated",
    {
      productId: string;
      storeId: string;
      changes: Record<string, { old: unknown; new: unknown }>;
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

export type ShopanaEvent =
  | ProductCreatedEvent
  | ProductDeletedEvent
  | ProductUpdatedEvent
  | OrderCreatedEvent
  | OrderCompletedEvent
  | StoreCreatedEvent
  | StoreDeletedEvent;

export type EventType = ShopanaEvent["eventType"];
