---
tags:
  - dbos
  - saga
  - compensation
  - distributed-transaction
  - rollback
related:
  - dbos/index
  - dbos/workflows
  - dbos/registry
  - dbos/errors
---
# Sagas

Durable workflows with automatic compensation on failure.

## Overview

Sagas are workflows that automatically roll back completed steps when a later step fails. Each step can have a compensation method that undoes its effects.

## BaseSaga

Abstract base class for workflows with automatic compensation:

```typescript
import { BaseSaga, Saga, SagaStep, WorkflowRegistry } from "@shopana/dbos";

@Injectable()
class OrderSaga extends BaseSaga<OrderInput, OrderResult> {
  constructor(
    registry: WorkflowRegistry,
    private readonly inventory: InventoryService,
    private readonly payments: PaymentService,
  ) {
    super(registry, "orders");
  }

  @Saga("createOrder")
  async run(input: OrderInput): Promise<SagaResult<OrderResult>> {
    const reservation = await this.reserveInventory(input);
    const payment = await this.processPayment(input, reservation);
    return { orderId: payment.orderId };
  }

  // ========== Step 1: Reserve Inventory ==========

  @SagaStep()
  private async reserveInventory(input: OrderInput): Promise<Reservation> {
    return this.inventory.reserve(input.items);
  }

  // Compensation: called if later step fails
  private async compensateReserveInventory(input: OrderInput): Promise<void> {
    await this.inventory.release(input.items);
  }

  // ========== Step 2: Process Payment ==========

  @SagaStep({ timeoutMs: 60_000 })
  private async processPayment(input: OrderInput, reservation: Reservation): Promise<Payment> {
    return this.payments.charge(input.paymentMethod, reservation.total);
  }

  private async compensateProcessPayment(input: OrderInput, reservation: Reservation): Promise<void> {
    await this.payments.refund(input.paymentMethod);
  }
}
```

## @Saga Decorator

Marks the `run()` method as saga entry point:

```typescript
@Saga(name: string, config?: SagaConfig)
```

### Options

```typescript
interface SagaConfig {
  // Retry policy for compensation methods
  compensationRetryPolicy?: RetryPolicy;

  // Callback when compensation exhausts retries
  onCompensationExhausted?: OnCompensationExhausted;
}

type OnCompensationExhausted = (
  step: string,
  method: string,
  error: Error,
  context: { sagaId: string }
) => void | Promise<void>;
```

### Default Compensation Retry

```typescript
const DEFAULT_COMPENSATION_RETRY: RetryPolicy = {
  maxAttempts: 10,
  intervalSeconds: 1,
  backoffRate: 2,  // 1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 512s
};
```

### Dead Letter Queue Hook

```typescript
@Saga("createOrder", {
  onCompensationExhausted: async (step, method, error, ctx) => {
    await dlq.send({
      type: "COMPENSATION_FAILED",
      sagaId: ctx.sagaId,
      step,
      method,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    await alerting.critical({
      message: `Saga compensation failed: ${step}`,
      sagaId: ctx.sagaId,
    });
  },
})
async run(input: OrderInput): Promise<OrderResult> { ... }
```

## @SagaStep Decorator

Marks a method as compensatable saga step:

```typescript
@SagaStep(config?: SagaStepConfig)
```

### Options

```typescript
interface SagaStepConfig {
  name?: string;          // Step name for logging
  timeoutMs?: number;     // Execution timeout (default: 30000)
  retry?: RetryPolicy;    // Retry configuration for the step
  retriesAllowed?: boolean; // Enable/disable retries (default: true)
}
```

## Compensation Convention

Compensation methods follow naming convention: `compensate${PascalCase(stepMethodName)}`

| Step Method | Compensation Method |
|-------------|---------------------|
| `reserveInventory` | `compensateReserveInventory` |
| `processPayment` | `compensateProcessPayment` |
| `createUser` | `compensateCreateUser` |
| `sendEmail` | `compensateSendEmail` |

### Method Signature

Compensation receives the same arguments as the forward step:

```typescript
@SagaStep()
private async processPayment(
  input: OrderInput,
  reservation: Reservation
): Promise<Payment> {
  return this.payments.charge(...);
}

// Same arguments
private async compensateProcessPayment(
  input: OrderInput,
  reservation: Reservation
): Promise<void> {
  await this.payments.refund(...);
}
```

### Steps Without Compensation

Steps without a compensation method are considered non-critical:

```typescript
@SagaStep({ retriesAllowed: false })
private async sendConfirmationEmail(orderId: string): Promise<void> {
  // No compensateSendConfirmationEmail method
  // Failure here triggers compensation of prior steps
  // But this step itself has no undo action
  await this.email.send(orderId);
}
```

## Compensation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Saga: createOrder                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. reserveInventory() ───────────────────────► ✅ Success       │
│     └── result: { reservationId: "res_123", total: 100 }        │
│                                                                  │
│  2. processPayment() ─────────────────────────► ✅ Success       │
│     └── result: { paymentId: "pay_456", status: "charged" }     │
│                                                                  │
│  3. createShipment() ─────────────────────────► ❌ FAIL          │
│     └── error: ShippingProviderUnavailable                       │
│                                                                  │
│  ═══════════════════ COMPENSATION (reverse order) ══════════════│
│                                                                  │
│  ← compensateProcessPayment() ────────────────► ✅ Refunded      │
│                                                                  │
│  ← compensateReserveInventory() ──────────────► ✅ Released      │
│                                                                  │
│  Result: {                                                       │
│    success: false,                                               │
│    status: "compensated",                                        │
│    compensated: true,                                            │
│    failedStep: "createShipment"                                  │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

## SagaResult

Return type for saga execution:

```typescript
interface SagaResult<TOutput> {
  success: boolean;          // Whether saga completed successfully
  status: SagaStatus;        // Current status
  data?: TOutput;            // Result data (if success)
  error?: OperationError;    // Error details (if failed)
  failedStep?: string;       // Step that caused failure
  compensated: boolean;      // Whether all compensations succeeded
}

type SagaStatus =
  | "pending"       // Not yet started
  | "running"       // Currently executing
  | "completed"     // All steps succeeded
  | "compensating"  // Running compensation
  | "compensated"   // Failed but compensations succeeded
  | "failed";       // Failed and some compensations failed
```

### Checking Result

```typescript
const result = await registry.run<OrderInput, SagaResult<OrderResult>>(
  "orders.createOrder",
  orderInput,
  idempotencyContext
);

if (result.success) {
  console.log("Order created:", result.data.orderId);
} else if (result.status === "compensated") {
  console.log("Order failed, all changes rolled back");
  console.log("Failed step:", result.failedStep);
} else if (result.status === "failed") {
  console.log("Order failed, SOME COMPENSATIONS FAILED");
  console.log("Manual intervention required");
}
```

## Saga Context

Access saga context within steps:

```typescript
import { getSagaContext } from "@shopana/dbos";

@SagaStep()
private async processPayment(input: OrderInput): Promise<Payment> {
  const ctx = getSagaContext();

  console.log("Saga ID:", ctx.sagaId);

  return this.payments.charge({
    ...input,
    idempotencyKey: ctx.sagaId,  // Use saga ID for payment idempotency
  });
}
```

## Full Example

```typescript
import {
  BaseSaga,
  Saga,
  SagaStep,
  WorkflowRegistry,
  RetryableError,
  FatalError,
  getSagaContext,
} from "@shopana/dbos";
import { Injectable } from "@nestjs/common";

interface OrderInput {
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: string;
  shippingAddress: Address;
}

interface OrderResult {
  orderId: string;
  total: number;
}

@Injectable()
export class OrderSaga extends BaseSaga<OrderInput, OrderResult> {
  constructor(
    registry: WorkflowRegistry,
    private readonly inventory: InventoryService,
    private readonly payments: PaymentService,
    private readonly orders: OrderService,
    private readonly shipping: ShippingService,
    private readonly notifications: NotificationService,
  ) {
    super(registry, "orders");
  }

  @Saga("createOrder", {
    onCompensationExhausted: async (step, method, error, ctx) => {
      await this.dlq.send({
        type: "COMPENSATION_FAILED",
        sagaId: ctx.sagaId,
        step,
        error: error.message,
      });
    },
  })
  async run(input: OrderInput): Promise<OrderResult> {
    // Step 1: Validate (no compensation needed)
    await this.validateOrder(input);

    // Step 2: Reserve inventory
    const reservation = await this.reserveInventory(input);

    // Step 3: Create order record
    const orderId = await this.createOrderRecord(input, reservation);

    // Step 4: Process payment
    const payment = await this.processPayment(input, reservation, orderId);

    // Step 5: Create shipment
    await this.createShipment(input, orderId);

    // Step 6: Send confirmation (non-critical)
    await this.sendConfirmation(input, orderId);

    return { orderId, total: payment.amount };
  }

  // ========== Step 1: Validate ==========

  @SagaStep()
  private async validateOrder(input: OrderInput): Promise<void> {
    if (input.items.length === 0) {
      throw new FatalError("Order must have items", undefined, "EMPTY_ORDER");
    }

    for (const item of input.items) {
      const exists = await this.inventory.productExists(item.productId);
      if (!exists) {
        throw new FatalError(
          `Product not found: ${item.productId}`,
          undefined,
          "PRODUCT_NOT_FOUND"
        );
      }
    }
  }
  // No compensation - validation has no side effects

  // ========== Step 2: Reserve Inventory ==========

  @SagaStep({
    retry: { maxAttempts: 3, intervalSeconds: 2, backoffRate: 2 }
  })
  private async reserveInventory(input: OrderInput): Promise<Reservation> {
    try {
      return await this.inventory.reserve(input.items);
    } catch (error) {
      if (error.code === "INSUFFICIENT_STOCK") {
        throw new FatalError("Insufficient stock", error, "INSUFFICIENT_STOCK");
      }
      throw new RetryableError("Inventory service unavailable", error);
    }
  }

  private async compensateReserveInventory(input: OrderInput): Promise<void> {
    await this.inventory.release(input.items);
  }

  // ========== Step 3: Create Order Record ==========

  @SagaStep()
  private async createOrderRecord(
    input: OrderInput,
    reservation: Reservation
  ): Promise<string> {
    return this.orders.create({
      customerId: input.customerId,
      items: input.items,
      total: reservation.total,
      status: "pending",
    });
  }

  private async compensateCreateOrderRecord(
    input: OrderInput,
    reservation: Reservation
  ): Promise<void> {
    const orderId = await this.orders.findPendingOrder(
      input.customerId,
      input.items
    );
    if (orderId) {
      await this.orders.cancel(orderId, "Saga compensation");
    }
  }

  // ========== Step 4: Process Payment ==========

  @SagaStep({ timeoutMs: 60_000 })
  private async processPayment(
    input: OrderInput,
    reservation: Reservation,
    orderId: string
  ): Promise<Payment> {
    const ctx = getSagaContext();

    return this.payments.charge({
      customerId: input.customerId,
      amount: reservation.total,
      method: input.paymentMethod,
      orderId,
      idempotencyKey: `${ctx.sagaId}-payment`,
    });
  }

  private async compensateProcessPayment(
    input: OrderInput,
    reservation: Reservation,
    orderId: string
  ): Promise<void> {
    await this.payments.refund({
      customerId: input.customerId,
      amount: reservation.total,
      method: input.paymentMethod,
      orderId,
      reason: "Order cancelled",
    });
  }

  // ========== Step 5: Create Shipment ==========

  @SagaStep()
  private async createShipment(input: OrderInput, orderId: string): Promise<void> {
    await this.shipping.createLabel({
      orderId,
      address: input.shippingAddress,
    });
  }

  private async compensateCreateShipment(
    input: OrderInput,
    orderId: string
  ): Promise<void> {
    await this.shipping.cancelLabel(orderId);
  }

  // ========== Step 6: Send Confirmation (non-critical) ==========

  @SagaStep({ retriesAllowed: false })
  private async sendConfirmation(input: OrderInput, orderId: string): Promise<void> {
    await this.notifications.sendOrderConfirmation(input.customerId, orderId);
  }
  // No compensation - notification doesn't need to be "unsent"
}
```

## Broker Integration

Use `BrokerSaga` from `@shopana/shared-kernel` for broker integration:

```typescript
import { BrokerSaga, Saga, SagaStep, InjectBroker } from "@shopana/shared-kernel";

@Injectable()
class OrderSaga extends BrokerSaga<OrderInput, OrderResult> {
  constructor(@InjectBroker("orders") broker: ServiceBroker) {
    super(broker);
  }

  @Saga("createOrder")
  async run(input: OrderInput): Promise<SagaResult<OrderResult>> {
    const reservation = await this.reserveInventory(input);
    const payment = await this.processPayment(input, reservation);
    return { orderId: payment.orderId };
  }

  @SagaStep()
  private async reserveInventory(input: OrderInput): Promise<Reservation> {
    return this.broker.call("inventory.reserve", { items: input.items });
  }

  private async compensateReserveInventory(input: OrderInput): Promise<void> {
    await this.broker.call("inventory.release", { items: input.items });
  }

  @SagaStep()
  private async processPayment(input: OrderInput, reservation: Reservation): Promise<Payment> {
    return this.broker.call("payments.charge", {
      amount: reservation.total,
      method: input.paymentMethod,
    });
  }

  private async compensateProcessPayment(input: OrderInput, reservation: Reservation): Promise<void> {
    await this.broker.call("payments.refund", {
      amount: reservation.total,
      method: input.paymentMethod,
    });
  }
}
```

## Related

- [[dbos/index]] — Package overview
- [[dbos/workflows]] — Simple durable workflows
- [[dbos/registry]] — Starting and monitoring sagas
- [[dbos/errors]] — Error handling and classification
- [[shared-kernel/base-classes]] — BrokerSaga integration
