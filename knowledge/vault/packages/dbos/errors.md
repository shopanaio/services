---
tags:
  - dbos
  - error
  - retry
  - timeout
  - policy
related:
  - dbos/index
  - dbos/workflows
  - dbos/sagas
  - shared-kernel/errors
---
# Error Handling

Error classes, retry policies, and timeout configuration.

## Overview

`@shopana/dbos` provides error classification to determine retry behavior:

| Error Type | Retryable | Use Case |
|------------|-----------|----------|
| `RetryableError` | Yes | Transient failures (network, rate limit) |
| `FatalError` | No | Business logic errors, validation |
| `StepTimeoutError` | No | Step execution timeout |

## Error Classes

### RetryableError

Transient failures that should be retried:

```typescript
import { RetryableError } from "@shopana/dbos";

@SagaStep({
  retry: { maxAttempts: 3, intervalSeconds: 2, backoffRate: 2 }
})
private async callExternalApi(): Promise<Response> {
  try {
    return await fetch(apiUrl);
  } catch (error) {
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      throw new RetryableError("External API unavailable", error);
    }
    throw error;
  }
}
```

### FatalError

Non-retryable business logic errors:

```typescript
import { FatalError } from "@shopana/dbos";

@SagaStep()
private async validateOrder(input: OrderInput): Promise<void> {
  if (input.items.length === 0) {
    throw new FatalError("Order must have items", undefined, "EMPTY_ORDER");
  }

  const customer = await this.customers.find(input.customerId);
  if (!customer) {
    throw new FatalError(
      "Customer not found",
      undefined,
      "CUSTOMER_NOT_FOUND"
    );
  }

  if (customer.status === "suspended") {
    throw new FatalError(
      "Customer account suspended",
      undefined,
      "CUSTOMER_SUSPENDED"
    );
  }
}
```

### StepTimeoutError

Thrown automatically when step exceeds timeout:

```typescript
@WorkflowStep({ timeoutMs: 30_000 })
private async longOperation(): Promise<void> {
  // If this takes > 30 seconds, StepTimeoutError is thrown
  await this.slowService.process();
}

// StepTimeoutError extends FatalError (non-retryable)
```

## Error Classification

The `isRetryableError()` function classifies errors:

### Retryable (Transient)

Errors classified as retryable:

```typescript
// Network errors
"ECONNREFUSED"
"ECONNRESET"
"ETIMEDOUT"
"ENOTFOUND"
"EPIPE"

// HTTP status codes
502  // Bad Gateway
503  // Service Unavailable
504  // Gateway Timeout

// Explicit retryable
error.retryable === true
error instanceof RetryableError
```

### Non-Retryable (Fatal)

Errors classified as fatal:

```typescript
// Explicit non-retryable
error.retryable === false
error instanceof FatalError
error instanceof StepTimeoutError

// Validation errors
error instanceof ValidationError

// Business logic errors
"INSUFFICIENT_STOCK"
"PAYMENT_DECLINED"
"CUSTOMER_SUSPENDED"
```

### Classification Example

```typescript
import { isRetryableError, RetryableError, FatalError } from "@shopana/dbos";

@SagaStep()
private async processPayment(input: PaymentInput): Promise<Payment> {
  try {
    return await this.paymentGateway.charge(input);
  } catch (error) {
    if (error.code === "CARD_DECLINED") {
      // Business logic error - don't retry
      throw new FatalError("Payment declined", error, "PAYMENT_DECLINED");
    }

    if (error.code === "GATEWAY_TIMEOUT") {
      // Transient error - retry
      throw new RetryableError("Payment gateway timeout", error);
    }

    // Let DBOS classify based on error properties
    throw error;
  }
}
```

## OperationError Format

Standardized error format for workflow results:

```typescript
interface OperationError {
  message: string;        // Human-readable message
  code?: string;          // Error code (e.g., "INSUFFICIENT_STOCK")
  retryable: boolean;     // Whether error was retryable
  name?: string;          // Error class name
  stack?: string;         // Stack trace (development only)
}
```

### In SagaResult

```typescript
const result = await registry.run<OrderInput, SagaResult<OrderResult>>(
  "orders.createOrder",
  input,
  ctx
);

if (!result.success && result.error) {
  console.log(result.error.code);     // "INSUFFICIENT_STOCK"
  console.log(result.error.message);  // "Not enough inventory"
  console.log(result.error.retryable); // false
}
```

## Retry Policies

### RetryPolicy Type

```typescript
interface RetryPolicy {
  maxAttempts: number;      // Total attempts (1 = no retry)
  intervalSeconds: number;  // Initial interval between retries
  backoffRate: number;      // Multiplier for exponential backoff
}
```

### Calculating Delays

With `{ maxAttempts: 5, intervalSeconds: 2, backoffRate: 2 }`:

| Attempt | Delay |
|---------|-------|
| 1 | 0s (immediate) |
| 2 | 2s |
| 3 | 4s |
| 4 | 8s |
| 5 | 16s |

Formula: `delay = intervalSeconds * (backoffRate ^ (attempt - 2))`

### Default Policies

```typescript
// Default for steps (no retry)
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 1,
  intervalSeconds: 0,
  backoffRate: 1,
};

// Default for compensation (aggressive retry)
const DEFAULT_COMPENSATION_RETRY: RetryPolicy = {
  maxAttempts: 10,
  intervalSeconds: 1,
  backoffRate: 2,
};
// Delays: 1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 512s
```

### Configuring Retry

```typescript
// Step-level retry
@SagaStep({
  retry: {
    maxAttempts: 5,
    intervalSeconds: 2,
    backoffRate: 2,
  }
})
private async callExternalService(): Promise<Response> { ... }

// Saga-level compensation retry
@Saga("createOrder", {
  compensationRetryPolicy: {
    maxAttempts: 20,
    intervalSeconds: 5,
    backoffRate: 1.5,
  }
})
async run(input: OrderInput): Promise<OrderResult> { ... }
```

## Timeouts

### Default Timeout

```typescript
const DEFAULT_STEP_TIMEOUT_MS = 30_000;  // 30 seconds
```

### Configuring Timeout

```typescript
@WorkflowStep({ timeoutMs: 60_000 })  // 60 seconds
private async longRunningOperation(): Promise<void> {
  // ...
}

@SagaStep({ timeoutMs: 120_000 })  // 2 minutes
private async processLargeFile(): Promise<void> {
  // ...
}
```

### Abort Signal

Steps receive an `AbortSignal` that fires on timeout:

```typescript
import { getSignal } from "@shopana/dbos";

@WorkflowStep({ timeoutMs: 30_000 })
private async fetchData(): Promise<Data> {
  const signal = getSignal();

  // Pass to fetch
  const response = await fetch(url, { signal });

  // Or check manually
  if (signal.aborted) {
    throw new Error("Operation aborted");
  }

  return response.json();
}
```

### Timeout Behavior

```
┌─────────────────────────────────────────────────────────────┐
│  Step: fetchData (timeoutMs: 30000)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  t=0s     Start step execution                               │
│  t=29s    Still running...                                   │
│  t=30s    TIMEOUT! AbortSignal fires                         │
│           ↓                                                  │
│  t=30s    StepTimeoutError thrown                            │
│           ↓                                                  │
│  t=30s    Step marked as FAILED (non-retryable)             │
│           ↓                                                  │
│  t=30s    Saga begins compensation                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling Patterns

### Wrap External Calls

```typescript
@SagaStep()
private async callInventoryService(items: Item[]): Promise<Reservation> {
  try {
    return await this.inventoryService.reserve(items);
  } catch (error) {
    // Classify errors
    if (error.code === "INSUFFICIENT_STOCK") {
      throw new FatalError("Insufficient stock", error, "INSUFFICIENT_STOCK");
    }
    if (error.code === "SERVICE_UNAVAILABLE") {
      throw new RetryableError("Inventory service down", error);
    }
    // Let DBOS handle unknown errors
    throw error;
  }
}
```

### Timeout-Aware Operations

```typescript
@WorkflowStep({ timeoutMs: 60_000 })
private async processBatch(items: Item[]): Promise<void> {
  const signal = getSignal();

  for (const item of items) {
    if (signal.aborted) {
      throw new FatalError("Processing interrupted by timeout");
    }
    await this.processItem(item);
  }
}
```

### Compensation Error Handling

```typescript
@Saga("createOrder", {
  onCompensationExhausted: async (step, method, error, ctx) => {
    // All retry attempts failed
    await this.dlq.send({
      type: "COMPENSATION_FAILED",
      sagaId: ctx.sagaId,
      step,
      method,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    await this.alerting.critical({
      message: `Manual intervention required: ${step}`,
      sagaId: ctx.sagaId,
      error: error.message,
    });
  },
})
async run(input: OrderInput): Promise<OrderResult> { ... }
```

## Full Example

```typescript
import {
  BaseSaga,
  Saga,
  SagaStep,
  RetryableError,
  FatalError,
  getSignal,
} from "@shopana/dbos";

@Injectable()
class PaymentSaga extends BaseSaga<PaymentInput, PaymentResult> {
  @Saga("processPayment", {
    compensationRetryPolicy: {
      maxAttempts: 10,
      intervalSeconds: 2,
      backoffRate: 2,
    },
    onCompensationExhausted: async (step, method, error, ctx) => {
      await this.alertService.critical({
        type: "COMPENSATION_FAILED",
        sagaId: ctx.sagaId,
        step,
        error: error.message,
      });
    },
  })
  async run(input: PaymentInput): Promise<PaymentResult> {
    const validation = await this.validatePayment(input);
    const charge = await this.chargeCard(input, validation);
    await this.sendReceipt(input, charge);
    return { transactionId: charge.id };
  }

  @SagaStep()
  private async validatePayment(input: PaymentInput): Promise<Validation> {
    const card = await this.cardService.validate(input.cardToken);

    if (!card.valid) {
      throw new FatalError("Invalid card", undefined, "INVALID_CARD");
    }

    if (card.expired) {
      throw new FatalError("Card expired", undefined, "CARD_EXPIRED");
    }

    return { card };
  }

  @SagaStep({
    timeoutMs: 60_000,
    retry: { maxAttempts: 3, intervalSeconds: 5, backoffRate: 2 }
  })
  private async chargeCard(input: PaymentInput, validation: Validation): Promise<Charge> {
    const signal = getSignal();

    try {
      return await this.paymentGateway.charge({
        amount: input.amount,
        card: validation.card,
        signal,
      });
    } catch (error) {
      if (error.code === "DECLINED") {
        throw new FatalError("Card declined", error, "CARD_DECLINED");
      }
      if (error.code === "FRAUD_DETECTED") {
        throw new FatalError("Fraud detected", error, "FRAUD_DETECTED");
      }
      if (error.code === "GATEWAY_ERROR") {
        throw new RetryableError("Gateway error", error);
      }
      throw error;
    }
  }

  private async compensateChargeCard(input: PaymentInput, validation: Validation): Promise<void> {
    await this.paymentGateway.refund({
      amount: input.amount,
      card: validation.card,
    });
  }

  @SagaStep({ retriesAllowed: false })
  private async sendReceipt(input: PaymentInput, charge: Charge): Promise<void> {
    await this.emailService.send({
      to: input.email,
      template: "payment-receipt",
      data: { amount: input.amount, transactionId: charge.id },
    });
  }
}
```

## Related

- [[dbos/index]] — Package overview
- [[dbos/workflows]] — Workflow step configuration
- [[dbos/sagas]] — Saga compensation
- [[shared-kernel/errors]] — Shared kernel error classes
