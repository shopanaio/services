---
tags:
  - shared-kernel
  - base-class
  - action
  - event
  - workflow
  - saga
related:
  - shared-kernel/index
  - shared-kernel/service-broker
  - shared-kernel/decorators
  - dbos
---
# Base Classes

Base classes for actions, event handlers, workflows, and sagas with automatic broker registration.

## Overview

| Base Class | Purpose | Decorator |
|------------|---------|-----------|
| `BrokerActions` | Action handlers | `@Action` |
| `EventHandlers` | Event handlers | `@EventHandler` |
| `BrokerWorkflows` | Durable workflows | `@Workflow`, `@WorkflowStep` |
| `BrokerSaga` | Compensating transactions | `@Saga`, `@SagaStep` |

All base classes:
- Require a `ServiceBroker` instance via `@InjectBroker`
- Automatically register decorated methods on initialization
- Provide access to the broker for inter-service communication

## BrokerActions

Base class for action handlers with automatic registration.

### Basic Usage

```typescript
import { Injectable } from "@nestjs/common";
import {
  BrokerActions,
  Action,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";

@Injectable()
class InventoryActions extends BrokerActions {
  constructor(
    @InjectBroker("inventory") broker: ServiceBroker,
    private readonly stockService: StockService,
    private readonly reservationService: ReservationService,
  ) {
    super(broker);
  }

  @Action("getStock")
  async getStock(params: { productId: string }): Promise<StockLevel> {
    return this.stockService.getLevel(params.productId);
  }

  @Action("reserveStock")
  async reserveStock(params: ReserveStockInput): Promise<Reservation> {
    return this.reservationService.create(params);
  }

  @Action("releaseStock")
  async releaseStock(params: { reservationId: string }): Promise<void> {
    await this.reservationService.release(params.reservationId);
  }
}
```

### With Validation and Authorization

```typescript
import {
  BrokerActions,
  Action,
  ZodSchema,
  Policy,
  InjectBroker,
  type Authorizable,
} from "@shopana/shared-kernel";

@Injectable()
class ProductActions extends BrokerActions implements Authorizable {
  readonly authProvider: AuthProvider;

  constructor(
    @InjectBroker("catalog") broker: ServiceBroker,
    @Inject(AUTH_PROVIDER) authProvider: AuthProvider,
    private readonly productService: ProductService,
  ) {
    super(broker);
    this.authProvider = authProvider;
  }

  @Action("getProduct")
  async getProduct(params: { id: string }): Promise<Product | null> {
    return this.productService.findById(params.id);
  }

  @Action("createProduct")
  @ZodSchema(createProductSchema)
  @Policy<CreateProductInput>({
    resource: "product",
    action: "create",
    organizationId: (_, params) => params.organizationId,
  })
  async createProduct(params: CreateProductInput): Promise<Product> {
    return this.productService.create(params);
  }

  @Action("deleteProduct")
  @Policy<DeleteProductInput>({
    resource: "product",
    action: "delete",
    organizationId: (_, params) => params.organizationId,
  })
  async deleteProduct(params: DeleteProductInput): Promise<void> {
    await this.productService.delete(params.id);
  }
}
```

### Calling Other Services

```typescript
@Injectable()
class OrderActions extends BrokerActions {
  @Action("createOrder")
  async createOrder(params: CreateOrderInput): Promise<Order> {
    // Call inventory service
    const reservation = await this.broker.call<Reservation>(
      "inventory.reserveStock",
      { items: params.items }
    );

    // Call pricing service
    const pricing = await this.broker.call<OrderPricing>(
      "pricing.calculateOrder",
      { items: params.items, couponCode: params.couponCode }
    );

    return this.orderService.create({
      ...params,
      reservationId: reservation.id,
      total: pricing.total,
    });
  }
}
```

## EventHandlers

Base class for event handlers with automatic registration.

### Basic Usage

```typescript
import { Injectable } from "@nestjs/common";
import {
  EventHandlers,
  EventHandler,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";

@Injectable()
class InventoryEventHandlers extends EventHandlers {
  constructor(
    @InjectBroker("inventory") broker: ServiceBroker,
    private readonly stockService: StockService,
    private readonly notificationService: NotificationService,
  ) {
    super(broker);
  }

  @EventHandler("order.created")
  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.stockService.reserveForOrder(event.orderId, event.items);
  }

  @EventHandler("order.cancelled")
  async onOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    await this.stockService.releaseForOrder(event.orderId);
  }

  @EventHandler("stock.low", {
    retryPolicy: { maxAttempts: 3, intervalSeconds: 10, backoffRate: 2 },
  })
  async onStockLow(event: StockLowEvent): Promise<void> {
    await this.notificationService.sendLowStockAlert(event.productId, event.available);
  }
}
```

### Multiple Event Handlers

```typescript
@Injectable()
class SearchEventHandlers extends EventHandlers {
  constructor(
    @InjectBroker("search") broker: ServiceBroker,
    private readonly searchIndexService: SearchIndexService,
  ) {
    super(broker);
  }

  @EventHandler("product.created")
  async onProductCreated(event: ProductCreatedEvent): Promise<void> {
    await this.searchIndexService.indexProduct(event.product);
  }

  @EventHandler("product.updated")
  async onProductUpdated(event: ProductUpdatedEvent): Promise<void> {
    await this.searchIndexService.updateProduct(event.product);
  }

  @EventHandler("product.deleted")
  async onProductDeleted(event: ProductDeletedEvent): Promise<void> {
    await this.searchIndexService.removeProduct(event.productId);
  }
}
```

## BrokerWorkflows

Base class for durable workflows with broker integration.

### Basic Usage

```typescript
import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  WorkflowStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";

@Injectable()
class FileCleanupWorkflow extends BrokerWorkflows<string, CleanupResult> {
  constructor(@InjectBroker("media") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("fileCleanup")
  async run(fileId: string): Promise<CleanupResult> {
    await this.deleteFile(fileId);
    await this.cleanupThumbnails(fileId);
    await this.notifyCleanup(fileId);
    return { cleaned: true, fileId };
  }

  @WorkflowStep()
  private async deleteFile(fileId: string): Promise<void> {
    await this.broker.call("storage.deleteFile", { fileId });
  }

  @WorkflowStep()
  private async cleanupThumbnails(fileId: string): Promise<void> {
    await this.broker.call("storage.deleteThumbnails", { fileId });
  }

  @WorkflowStep({ retriesAllowed: false })
  private async notifyCleanup(fileId: string): Promise<void> {
    await this.broker.call("notifications.send", {
      type: "file_cleaned",
      fileId,
    });
  }
}
```

### Complex Workflow

```typescript
@Injectable()
class OrderFulfillmentWorkflow extends BrokerWorkflows<OrderInput, FulfillmentResult> {
  constructor(@InjectBroker("orders") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("orderFulfillment")
  async run(input: OrderInput): Promise<FulfillmentResult> {
    // Step 1: Validate order
    const validation = await this.validateOrder(input);
    if (!validation.valid) {
      return { status: "rejected", reason: validation.errors };
    }

    // Step 2: Reserve inventory
    const reservation = await this.reserveInventory(input);

    // Step 3: Process payment
    const payment = await this.processPayment(input, reservation);

    // Step 4: Create shipping label
    const shipping = await this.createShippingLabel(input, payment);

    // Step 5: Update order status
    await this.updateOrderStatus(input.orderId, "fulfilled");

    return {
      status: "fulfilled",
      orderId: input.orderId,
      trackingNumber: shipping.trackingNumber,
    };
  }

  @WorkflowStep()
  private async validateOrder(input: OrderInput): Promise<ValidationResult> {
    return this.broker.call("orders.validate", input);
  }

  @WorkflowStep()
  private async reserveInventory(input: OrderInput): Promise<Reservation> {
    return this.broker.call("inventory.reserve", { items: input.items });
  }

  @WorkflowStep()
  private async processPayment(
    input: OrderInput,
    reservation: Reservation
  ): Promise<Payment> {
    return this.broker.call("payments.charge", {
      orderId: input.orderId,
      amount: reservation.total,
      method: input.paymentMethod,
    });
  }

  @WorkflowStep({ retriesAllowed: false })
  private async createShippingLabel(
    input: OrderInput,
    payment: Payment
  ): Promise<Shipping> {
    return this.broker.call("delivery.createLabel", {
      orderId: input.orderId,
      address: input.shippingAddress,
    });
  }

  @WorkflowStep()
  private async updateOrderStatus(
    orderId: string,
    status: string
  ): Promise<void> {
    await this.broker.call("orders.updateStatus", { orderId, status });
  }
}
```

### Workflow Execution

```typescript
// Via broker
const result = await broker.runWorkflow<FulfillmentResult>(
  "orders.orderFulfillment",
  orderInput,
  {
    source: "content",
    resourceId: orderInput.orderId,
    operation: "fulfill",
  }
);

// Check status
const registry = broker.getWorkflowRegistry();
const handle = await registry.getWorkflowHandle(workflowId);
const status = await handle.getStatus();
```

## BrokerSaga

Base class for sagas with automatic compensation on failure.

### Basic Usage

```typescript
import { Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  ServiceBroker,
  type SagaResult,
} from "@shopana/shared-kernel";

@Injectable()
class OrderSaga extends BrokerSaga<OrderInput, OrderResult> {
  constructor(@InjectBroker("orders") broker: ServiceBroker) {
    super(broker);
  }

  @Saga("createOrder")
  async run(input: OrderInput): Promise<SagaResult<OrderResult>> {
    // Step 1: Reserve inventory
    const reservation = await this.reserveInventory(input);

    // Step 2: Process payment
    const payment = await this.processPayment(input, reservation);

    // Step 3: Create order
    const order = await this.createOrder(input, reservation, payment);

    return { orderId: order.id, status: "completed" };
  }

  // Forward step
  @SagaStep()
  private async reserveInventory(input: OrderInput): Promise<Reservation> {
    return this.broker.call("inventory.reserve", { items: input.items });
  }

  // Compensation for reserveInventory
  private async compensateReserveInventory(input: OrderInput): Promise<void> {
    await this.broker.call("inventory.release", { items: input.items });
  }

  @SagaStep()
  private async processPayment(
    input: OrderInput,
    reservation: Reservation
  ): Promise<Payment> {
    return this.broker.call("payments.charge", {
      amount: reservation.total,
      method: input.paymentMethod,
    });
  }

  // Compensation for processPayment
  private async compensateProcessPayment(
    input: OrderInput,
    reservation: Reservation
  ): Promise<void> {
    await this.broker.call("payments.refund", {
      amount: reservation.total,
      method: input.paymentMethod,
    });
  }

  @SagaStep()
  private async createOrder(
    input: OrderInput,
    reservation: Reservation,
    payment: Payment
  ): Promise<Order> {
    return this.broker.call("orders.create", {
      ...input,
      reservationId: reservation.id,
      paymentId: payment.id,
    });
  }

  // Compensation for createOrder
  private async compensateCreateOrder(
    input: OrderInput,
    reservation: Reservation,
    payment: Payment
  ): Promise<void> {
    await this.broker.call("orders.cancel", { orderId: input.orderId });
  }
}
```

### Compensation Behavior

```
Order Creation Saga
───────────────────
1. reserveInventory() ──────────► SUCCESS
2. processPayment()   ──────────► SUCCESS
3. createOrder()      ──────────► FAILURE

Automatic Compensation (reverse order):
──────────────────────────────────────
3. compensateProcessPayment() ──► Refund
2. compensateReserveInventory() ─► Release stock
1. (reserveInventory has no prior steps)
```

### Saga Execution

```typescript
// Via broker
const result = await broker.runSaga<OrderResult>(
  "orders.createOrder",
  orderInput,
  {
    source: "content",
    resourceId: orderInput.orderId,
    operation: "createOrder",
  }
);

// Check result
if (result.status === "completed") {
  console.log("Order created:", result.data.orderId);
} else if (result.status === "compensated") {
  console.log("Saga rolled back");
  console.log("Compensation errors:", result.compensationErrors);
} else if (result.status === "failed") {
  console.log("Saga failed:", result.error);
}
```

### SagaResult Type

```typescript
type SagaResult<T> =
  | { status: "completed"; data: T }
  | { status: "compensated"; compensationErrors?: Error[] }
  | { status: "failed"; error: Error };
```

## Module Registration

All base class implementations should be registered in the module providers:

```typescript
// inventory.module.ts
import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";

@Module({
  imports: [
    BrokerModule.forFeature({ serviceName: "inventory" }),
  ],
  providers: [
    // Actions
    InventoryActions,

    // Event handlers
    InventoryEventHandlers,

    // Workflows
    StockReservationWorkflow,

    // Sagas
    InventoryAdjustmentSaga,

    // Services and repositories
    StockService,
    InventoryRepository,
  ],
})
export class InventoryModule {}
```

## Related

- [[shared-kernel/service-broker]] — ServiceBroker API reference
- [[shared-kernel/decorators]] — @Action, @EventHandler, @Workflow decorators
- [[dbos]] — DBOS workflow engine details
