---
tags:
  - shared-kernel
  - broker
  - action
  - inter-service
  - communication
related:
  - shared-kernel/index
  - shared-kernel/nestjs-modules
  - shared-kernel/base-classes
  - dbos
---
# ServiceBroker

Central hub for action registration and inter-service communication.

## Overview

The `ServiceBroker` is the communication backbone of the shared-kernel architecture:

1. **Action Registry** — Register and discover service actions
2. **Inter-Service Calls** — Call actions across service boundaries
3. **Workflow Execution** — Run durable workflows via DBOS integration
4. **Saga Execution** — Run compensating transactions with automatic rollback
5. **Health Monitoring** — Track registered actions and service health

## Injection

Inject the broker using `@InjectBroker(serviceName)`:

```typescript
import { Injectable } from "@nestjs/common";
import { InjectBroker, ServiceBroker } from "@shopana/shared-kernel";

@Injectable()
class InventoryService {
  constructor(
    @InjectBroker("inventory") private broker: ServiceBroker
  ) {}
}
```

## Action Naming Convention

Actions use qualified names: `{serviceName}.{actionName}`

```typescript
// Service: "inventory"
// Action name: "getStock"
// Full name: "inventory.getStock"

// Registration (automatic prefix)
broker.register("getStock", handler);

// Calling (must use full name)
await broker.call("inventory.getStock", { productId });
```

## API Reference

### register()

Register a local action handler:

```typescript
broker.register(
  actionName: string,
  handler: ActionHandler,
  metadata?: ActionMetadata
): void

// Example
broker.register(
  "getStock",
  async (params: { productId: string }) => {
    return stockRepository.findByProductId(params.productId);
  },
  { description: "Get stock level for a product" }
);
```

**Note:** The `@Action` decorator handles registration automatically. Manual registration is rarely needed.

### call()

Call any registered action:

```typescript
broker.call<TResult>(
  action: string,
  params?: Record<string, unknown>
): Promise<TResult>

// Examples
const stock = await broker.call<StockLevel>("inventory.getStock", {
  productId: "prod_123",
});

const user = await broker.call<User>("iam.getCurrentUser", {
  userId: "user_456",
});

// Call action in same service
const product = await broker.call<Product>("catalog.getProduct", {
  id: productId,
});
```

**Error handling:**

```typescript
try {
  await broker.call("inventory.reserveStock", { productId, quantity });
} catch (error) {
  if (error instanceof ValidationError) {
    // Input validation failed
  } else if (error instanceof AuthorizationError) {
    // Permission denied
  } else if (error instanceof KernelError) {
    // Domain error
  }
}
```

### hasAction()

Check if action exists:

```typescript
broker.hasAction(action: string): boolean

// Example
if (broker.hasAction("payments.processPayment")) {
  await broker.call("payments.processPayment", { orderId });
} else {
  logger.warn("Payment service not available");
}
```

### getActionMetadata()

Get action metadata:

```typescript
broker.getActionMetadata(action: string): ActionMetadata | undefined

// Example
const meta = broker.getActionMetadata("inventory.reserveStock");
console.log(meta?.description);  // "Reserve stock for order"
console.log(meta?.schema);       // Zod schema if defined
```

### runWorkflow()

Execute a durable workflow:

```typescript
broker.runWorkflow<TResult>(
  name: string,
  params: Record<string, unknown>,
  idempotencyContext: IdempotencyContext
): Promise<TResult>

// Example
const result = await broker.runWorkflow<OrderResult>(
  "orders.createOrder",
  {
    items: orderItems,
    customerId: "cust_123",
  },
  {
    source: "workflow",
    workflowId: parentWorkflowId,
    stepId: "createOrder",
  }
);
```

### runSaga()

Execute a saga with automatic compensation:

```typescript
broker.runSaga<TResult>(
  name: string,
  params: Record<string, unknown>,
  idempotencyContext: IdempotencyContext
): Promise<SagaResult<TResult>>

// Example
const result = await broker.runSaga<OrderResult>(
  "orders.processOrder",
  { orderId: "order_123" },
  {
    source: "content",
    resourceId: "order_123",
    operation: "processOrder",
  }
);

if (result.status === "completed") {
  console.log(result.data);
} else if (result.status === "compensated") {
  console.log("Saga rolled back:", result.compensationErrors);
}
```

### hasWorkflow()

Check if workflow exists:

```typescript
broker.hasWorkflow(name: string): boolean

// Example
if (broker.hasWorkflow("orders.createOrder")) {
  await broker.runWorkflow("orders.createOrder", params, ctx);
}
```

### getWorkflowRegistry()

Get the underlying WorkflowRegistry:

```typescript
broker.getWorkflowRegistry(): WorkflowRegistry

// Example
const registry = broker.getWorkflowRegistry();
const handle = await registry.getWorkflowHandle(workflowId);
const status = await handle.getStatus();
```

### getHealth()

Get health check snapshot:

```typescript
broker.getHealth(): BrokerHealth

// Example
const health = broker.getHealth();
console.log({
  serviceName: health.serviceName,
  actionsCount: health.actionsCount,
  workflowsCount: health.workflowsCount,
  sagasCount: health.sagasCount,
});
```

## IdempotencyContext

Context for ensuring idempotent workflow/saga execution:

```typescript
interface IdempotencyContext {
  source: "workflow" | "content" | "manual";
  workflowId?: string;   // Parent workflow ID (source: "workflow")
  stepId?: string;       // Step identifier (source: "workflow")
  resourceId?: string;   // Resource ID (source: "content")
  operation?: string;    // Operation name (source: "content")
  idempotencyKey?: string; // Manual key (source: "manual")
}
```

### Usage Patterns

```typescript
// From within a workflow step
const ctx: IdempotencyContext = {
  source: "workflow",
  workflowId: currentWorkflowId,
  stepId: "reserveInventory",
};

// For content-based idempotency (e.g., order processing)
const ctx: IdempotencyContext = {
  source: "content",
  resourceId: orderId,
  operation: "processPayment",
};

// Manual idempotency key
const ctx: IdempotencyContext = {
  source: "manual",
  idempotencyKey: `import-${batchId}-${rowNumber}`,
};
```

## Type Definitions

```typescript
// Action handler type
type ActionHandler<TParams = unknown, TResult = unknown> = (
  params: TParams
) => Promise<TResult>;

// Action metadata
interface ActionMetadata {
  description?: string;
  schema?: ZodSchema;
  policy?: PolicyConfig;
  tags?: string[];
}

// Broker options
interface ServiceBrokerOptions {
  serviceName: string;
  logger?: Logger;
}

// Health snapshot
interface BrokerHealth {
  serviceName: string;
  actionsCount: number;
  workflowsCount: number;
  sagasCount: number;
  registeredActions: string[];
}
```

## Common Patterns

### Cross-Service Data Fetching

```typescript
@Injectable()
class OrderService {
  constructor(@InjectBroker("orders") private broker: ServiceBroker) {}

  async enrichOrderWithDetails(orderId: string): Promise<EnrichedOrder> {
    const order = await this.orderRepository.findById(orderId);

    // Fetch data from other services in parallel
    const [customer, products, shippingRate] = await Promise.all([
      this.broker.call<Customer>("iam.getUser", { userId: order.customerId }),
      this.broker.call<Product[]>("catalog.getProducts", {
        ids: order.items.map(i => i.productId),
      }),
      this.broker.call<ShippingRate>("delivery.calculateRate", {
        address: order.shippingAddress,
        items: order.items,
      }),
    ]);

    return { ...order, customer, products, shippingRate };
  }
}
```

### Conditional Service Calls

```typescript
async processPayment(orderId: string, method: PaymentMethod) {
  const action = `payments.process${method.type}`;

  if (!this.broker.hasAction(action)) {
    throw new KernelError(
      `Payment method ${method.type} not supported`,
      "UNSUPPORTED_PAYMENT_METHOD"
    );
  }

  return this.broker.call(action, { orderId, method });
}
```

### Workflow Orchestration

```typescript
@Injectable()
class CheckoutWorkflow extends BrokerWorkflows<CheckoutInput, CheckoutResult> {
  @Workflow("checkout")
  async run(input: CheckoutInput): Promise<CheckoutResult> {
    // Step 1: Validate cart
    const cart = await this.broker.call<Cart>("checkout.validateCart", {
      cartId: input.cartId,
    });

    // Step 2: Reserve inventory (via saga for compensation)
    const reservation = await this.broker.runSaga<Reservation>(
      "inventory.reserveItems",
      { items: cart.items },
      { source: "workflow", workflowId: this.workflowId, stepId: "reserve" }
    );

    // Step 3: Process payment
    const payment = await this.broker.call<Payment>("payments.charge", {
      amount: cart.total,
      method: input.paymentMethod,
    });

    // Step 4: Create order
    const order = await this.broker.call<Order>("orders.create", {
      cart,
      payment,
      reservation,
    });

    return { orderId: order.id, status: "completed" };
  }
}
```

## Related

- [[shared-kernel/base-classes]] — BrokerActions for declarative action registration
- [[shared-kernel/decorators]] — @Action, @Policy decorators
- [[shared-kernel/nestjs-modules]] — BrokerModule configuration
- [[dbos]] — Workflow and saga engine details
