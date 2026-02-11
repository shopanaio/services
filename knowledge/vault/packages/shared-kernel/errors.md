---
tags:
  - shared-kernel
  - error
  - exception
  - validation
  - authorization
related:
  - shared-kernel/index
  - shared-kernel/decorators
  - shared-kernel/service-broker
  - type-resolver
---
# Error Classes

Standard error classes for consistent error handling across services.

## Overview

| Error Class | Purpose | HTTP Status | Retryable |
|-------------|---------|-------------|-----------|
| `KernelError` | Domain/business errors | 400 | No |
| `ValidationError` | Input validation failures | 400 | No |
| `AuthorizationError` | Permission denied | 403 | No |
| `RetryableError` | Transient failures | 503 | Yes |
| `FatalError` | Unrecoverable errors | 500 | No |

## KernelError

Base error class for domain/business logic errors.

### Basic Usage

```typescript
import { KernelError } from "@shopana/shared-kernel";

// Simple error
throw new KernelError("Product not found", "PRODUCT_NOT_FOUND");

// With context data
throw new KernelError(
  "Product not found",
  "PRODUCT_NOT_FOUND",
  { productId: "prod_123" }
);

// With cause
try {
  await externalService.call();
} catch (cause) {
  throw new KernelError(
    "External service failed",
    "EXTERNAL_SERVICE_ERROR",
    { service: "inventory" },
    cause
  );
}
```

### Properties

```typescript
class KernelError extends Error {
  readonly code: string;      // Error code (e.g., "PRODUCT_NOT_FOUND")
  readonly context?: object;  // Additional context data
  readonly cause?: Error;     // Original error

  constructor(
    message: string,
    code: string,
    context?: object,
    cause?: Error
  );
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Resource not found |
| `ALREADY_EXISTS` | Resource already exists |
| `INVALID_STATE` | Invalid operation for current state |
| `INSUFFICIENT_STOCK` | Not enough inventory |
| `PAYMENT_FAILED` | Payment processing failed |
| `QUOTA_EXCEEDED` | Rate limit or quota exceeded |

### Usage in Actions

```typescript
@Action("getProduct")
async getProduct(params: { id: string }): Promise<Product> {
  const product = await this.repository.findById(params.id);

  if (!product) {
    throw new KernelError(
      `Product with ID ${params.id} not found`,
      "PRODUCT_NOT_FOUND",
      { productId: params.id }
    );
  }

  return product;
}
```

## ValidationError

Error for input validation failures. Thrown automatically by `@ZodSchema` decorator.

### Basic Usage

```typescript
import { ValidationError, type UserError } from "@shopana/shared-kernel";

const errors: UserError[] = [
  { code: "INVALID_INPUT", message: "Title is required", field: ["title"] },
  { code: "INVALID_INPUT", message: "Price must be positive", field: ["price"] },
];

throw new ValidationError(errors);
```

### UserError Type

```typescript
interface UserError {
  code: string;           // Error code
  message: string;        // Human-readable message
  field: string[] | null; // Path to invalid field (null for general errors)
}
```

### Properties

```typescript
class ValidationError extends Error {
  readonly errors: UserError[];  // List of validation errors

  constructor(errors: UserError[]);
}
```

### Catching Validation Errors

```typescript
try {
  await broker.call("catalog.createProduct", {
    title: "",
    price: -10,
  });
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
    for (const err of error.errors) {
      console.log(`${err.field?.join(".")}: ${err.message}`);
    }
    // Output:
    // title: Title is required
    // price: Price must be positive
  }
}
```

### Manual Validation

```typescript
@Action("updateStock")
async updateStock(params: UpdateStockInput): Promise<StockLevel> {
  const errors: UserError[] = [];

  if (params.quantity < 0) {
    errors.push({
      code: "INVALID_INPUT",
      message: "Quantity cannot be negative",
      field: ["quantity"],
    });
  }

  if (params.location && !VALID_LOCATIONS.includes(params.location)) {
    errors.push({
      code: "INVALID_INPUT",
      message: `Invalid location: ${params.location}`,
      field: ["location"],
    });
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return this.stockService.update(params);
}
```

## AuthorizationError

Error for permission denied. Thrown automatically by `@Policy` decorator.

### Basic Usage

```typescript
import { AuthorizationError, type UserError } from "@shopana/shared-kernel";

throw new AuthorizationError(
  [{ code: "FORBIDDEN", message: "Access denied", field: null }],
  "product",   // resource
  "delete"     // action
);
```

### Properties

```typescript
class AuthorizationError extends Error {
  readonly errors: UserError[];
  readonly resource: string;   // Resource being accessed
  readonly action: string;     // Action being performed

  constructor(
    errors: UserError[],
    resource: string,
    action: string
  );
}
```

### Catching Authorization Errors

```typescript
try {
  await broker.call("catalog.deleteProduct", {
    id: productId,
    organizationId: orgId,
  });
} catch (error) {
  if (error instanceof AuthorizationError) {
    console.log(`Cannot ${error.action} ${error.resource}`);
    // Output: Cannot delete product

    // Log for audit
    logger.warn({
      userId: currentUser.id,
      resource: error.resource,
      action: error.action,
      organizationId: orgId,
    }, "Authorization denied");
  }
}
```

### Custom Authorization Check

```typescript
@Action("transferOwnership")
async transferOwnership(params: TransferInput): Promise<void> {
  const isAdmin = await this.authProvider.hasRole("admin");
  const isOwner = await this.authProvider.isResourceOwner(
    "product",
    params.productId
  );

  if (!isAdmin && !isOwner) {
    throw new AuthorizationError(
      [{
        code: "FORBIDDEN",
        message: "Only admins or owners can transfer ownership",
        field: null,
      }],
      "product",
      "transferOwnership"
    );
  }

  await this.productService.transferOwnership(params);
}
```

## RetryableError

Error for transient failures that can be retried.

### Basic Usage

```typescript
import { RetryableError } from "@shopana/shared-kernel";

// Simple retryable error
throw new RetryableError("Service temporarily unavailable");

// With retry hint
throw new RetryableError(
  "Rate limit exceeded",
  { retryAfterMs: 5000 }
);

// With cause
try {
  await externalApi.call();
} catch (cause) {
  throw new RetryableError(
    "External API timeout",
    { retryAfterMs: 1000 },
    cause
  );
}
```

### Properties

```typescript
class RetryableError extends Error {
  readonly retryAfterMs?: number;  // Suggested retry delay
  readonly cause?: Error;          // Original error

  constructor(
    message: string,
    options?: { retryAfterMs?: number },
    cause?: Error
  );
}
```

### Usage in Workflows

```typescript
@WorkflowStep()
private async callExternalService(params: Params): Promise<Result> {
  try {
    return await this.externalClient.call(params);
  } catch (error) {
    if (error.code === "RATE_LIMITED") {
      // Workflow engine will retry this step
      throw new RetryableError(
        "External service rate limited",
        { retryAfterMs: error.retryAfter * 1000 }
      );
    }

    if (error.code === "TIMEOUT") {
      throw new RetryableError("External service timeout");
    }

    // Non-retryable error
    throw new FatalError("External service failed", undefined, error.code);
  }
}
```

## FatalError

Error for unrecoverable failures that should not be retried.

### Basic Usage

```typescript
import { FatalError } from "@shopana/shared-kernel";

// Simple fatal error
throw new FatalError("Invalid configuration");

// With context
throw new FatalError(
  "Invalid product ID format",
  { productId: params.id },
  "INVALID_ID"
);

// With cause
try {
  await criticalOperation();
} catch (cause) {
  throw new FatalError(
    "Critical operation failed",
    { operation: "migrate" },
    "MIGRATION_FAILED",
    cause
  );
}
```

### Properties

```typescript
class FatalError extends Error {
  readonly code?: string;     // Error code
  readonly context?: object;  // Additional context
  readonly cause?: Error;     // Original error

  constructor(
    message: string,
    context?: object,
    code?: string,
    cause?: Error
  );
}
```

### Usage in Sagas

```typescript
@SagaStep()
private async processPayment(input: OrderInput): Promise<Payment> {
  const result = await this.paymentGateway.charge({
    amount: input.total,
    method: input.paymentMethod,
  });

  if (result.status === "declined") {
    // No point retrying a declined card
    throw new FatalError(
      "Payment declined",
      { reason: result.declineReason },
      "PAYMENT_DECLINED"
    );
  }

  if (result.status === "fraud_detected") {
    // Security issue, don't retry
    throw new FatalError(
      "Fraud detected",
      { transactionId: result.transactionId },
      "FRAUD_DETECTED"
    );
  }

  return result;
}
```

## Error Handling Patterns

### In Service Layer

```typescript
class ProductService {
  async create(input: CreateProductInput): Promise<Product> {
    // Validation
    if (await this.repository.existsBySku(input.sku)) {
      throw new KernelError(
        `Product with SKU ${input.sku} already exists`,
        "SKU_EXISTS",
        { sku: input.sku }
      );
    }

    // Business logic that might fail transiently
    try {
      await this.searchService.indexProduct(product);
    } catch (error) {
      throw new RetryableError(
        "Failed to index product",
        { retryAfterMs: 1000 },
        error
      );
    }

    return this.repository.create(input);
  }
}
```

### In GraphQL Resolvers

```typescript
// With @shopana/type-resolver
@Resolver()
class ProductResolver {
  @Mutation()
  async productCreate(input: ProductCreateInput): Promise<ProductPayload> {
    try {
      const product = await this.broker.call<Product>(
        "catalog.createProduct",
        input
      );
      return { product, userErrors: [] };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { product: null, userErrors: error.errors };
      }
      if (error instanceof AuthorizationError) {
        return { product: null, userErrors: error.errors };
      }
      if (error instanceof KernelError) {
        return {
          product: null,
          userErrors: [{
            code: error.code,
            message: error.message,
            field: null,
          }],
        };
      }
      throw error; // Unexpected error
    }
  }
}
```

### Error Type Guards

```typescript
import {
  KernelError,
  ValidationError,
  AuthorizationError,
  RetryableError,
  FatalError,
} from "@shopana/shared-kernel";

function handleError(error: unknown): void {
  if (error instanceof ValidationError) {
    // Input validation failed
    logValidationErrors(error.errors);
    return;
  }

  if (error instanceof AuthorizationError) {
    // Permission denied
    logAuthorizationDenied(error.resource, error.action);
    return;
  }

  if (error instanceof RetryableError) {
    // Schedule retry
    scheduleRetry(error.retryAfterMs ?? 5000);
    return;
  }

  if (error instanceof FatalError) {
    // Alert and investigate
    alertOnFatalError(error);
    return;
  }

  if (error instanceof KernelError) {
    // Domain error
    logDomainError(error.code, error.context);
    return;
  }

  // Unknown error
  logUnexpectedError(error);
}
```

## Type Definitions

```typescript
import type { UserError } from "@shopana/shared-kernel";

// All error classes
import {
  KernelError,
  ValidationError,
  AuthorizationError,
  RetryableError,
  FatalError,
} from "@shopana/shared-kernel";
```

## Related

- [[shared-kernel/decorators]] — @ZodSchema and @Policy that throw these errors
- [[shared-kernel/service-broker]] — Error propagation across service calls
- [[type-resolver]] — GraphQL error handling with userErrors
