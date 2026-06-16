---
tags:
  - shared-kernel
  - microkernel
  - transaction-script
  - pattern
related:
  - shared-kernel/index
  - shared-kernel/service-broker
  - shared-kernel/transaction-manager
---
# Kernel

Microkernel class for executing transaction scripts with automatic transaction management.

## Overview

The `Kernel` class is the core execution engine that:

1. Provides a **service container** with broker, logger, and custom services
2. Executes **transaction scripts** — functions that receive services and context
3. Automatically wraps write operations in **database transactions**
4. Propagates **context** (requestId, projectId, metadata) through the call stack

## Transaction Script Pattern

A transaction script is a pure function that:
- Receives input parameters, services, and execution context
- Performs business logic using injected services
- Returns a result or throws an error

```typescript
type TransactionScript<TParams, TResult, TServices> = (
  params: TParams,
  services: TServices,
  context?: ScriptContext
) => Promise<TResult>;
```

### Why Transaction Scripts?

| Benefit | Description |
|---------|-------------|
| **Simplicity** | Business logic is just a function |
| **Testability** | Easy to test with mock services |
| **Composability** | Scripts can call other scripts |
| **Transaction Safety** | Automatic commit/rollback |
| **Dependency Injection** | Services provided via container |

## Creating a Kernel

```typescript
import { Kernel, type BaseKernelServices, type Logger } from "@shopana/shared-kernel";

// Define extended services
interface InventoryServices extends BaseKernelServices {
  readonly repository: InventoryRepository;
  readonly pricingService: PricingService;
}

// Create kernel instance
const kernel = new Kernel<InventoryServices>(
  broker,   // ServiceBroker instance
  logger,   // Logger instance
  {
    repository: inventoryRepository,
    pricingService: pricingService,
  }
);
```

### Base Services

Every kernel provides these base services:

```typescript
interface BaseKernelServices {
  readonly broker: ServiceBroker;
  readonly logger: Logger;
}
```

You extend this interface to add your own services (repositories, domain services, etc.).

## Executing Scripts

### Write Operations (with transaction)

Use `executeScript()` for operations that modify data:

```typescript
const createProduct: TransactionScript<CreateProductInput, Product, InventoryServices> =
  async (params, services, context) => {
    services.logger.info({ requestId: context?.requestId }, "Creating product");

    // All database operations are in a transaction
    const product = await services.repository.product.create(params);
    await services.repository.stockLevel.create({
      productId: product.id,
      available: params.initialStock ?? 0,
    });

    return product;
  };

// Execute (auto-wrapped in transaction)
const product = await kernel.executeScript(
  createProduct,
  { title: "New Product", initialStock: 100 }
);
```

**Transaction behavior:**
- Starts transaction before script execution
- Commits on successful completion
- Rolls back on any error

### Read Operations (no transaction)

Use `executeScriptReadOnly()` for queries:

```typescript
const getProductWithStock: TransactionScript<{ id: string }, ProductWithStock, InventoryServices> =
  async (params, services) => {
    const product = await services.repository.product.findById(params.id);
    if (!product) throw new KernelError("Product not found", "PRODUCT_NOT_FOUND");

    const stock = await services.repository.stockLevel.getByProductId(params.id);
    return { ...product, stock };
  };

// Execute without transaction overhead
const result = await kernel.executeScriptReadOnly(
  getProductWithStock,
  { id: "prod_123" }
);
```

### With Context

Pass execution context for tracing and multi-tenancy:

```typescript
const context: ScriptContext = {
  requestId: "req_abc123",
  projectId: "proj_xyz",
  startTime: Date.now(),
  metadata: {
    userId: "user_123",
    source: "api",
  },
};

const result = await kernel.executeScript(
  createProduct,
  productInput,
  context
);
```

## ScriptContext

Execution context passed to all scripts:

```typescript
interface ScriptContext {
  readonly requestId?: string;  // Correlation ID for tracing
  readonly projectId?: string;  // Multi-tenant project identifier
  readonly startTime: number;   // Execution start timestamp
  readonly metadata?: Record<string, unknown>;  // Custom metadata
}
```

### Using Context in Scripts

```typescript
const processOrder: TransactionScript<OrderInput, Order, OrderServices> =
  async (params, services, context) => {
    const { logger, broker, repository } = services;

    // Log with context
    logger.info({
      requestId: context?.requestId,
      projectId: context?.projectId,
      orderId: params.orderId,
    }, "Processing order");

    // Pass context to other service calls
    const inventory = await broker.call("inventory.reserveStock", {
      items: params.items,
      projectId: context?.projectId,
    });

    // Track timing
    const elapsed = Date.now() - (context?.startTime ?? Date.now());
    logger.info({ elapsed }, "Order processing completed");

    return repository.order.create(params);
  };
```

## Composing Scripts

Scripts can call other scripts while sharing the same transaction:

```typescript
const createProductWithVariants: TransactionScript<CreateProductWithVariantsInput, Product, CatalogServices> =
  async (params, services, context) => {
    // Create main product
    const product = await services.kernel.executeScript(
      createProduct,
      params.product,
      context
    );

    // Create variants (same transaction)
    for (const variant of params.variants) {
      await services.kernel.executeScript(
        createVariant,
        { ...variant, productId: product.id },
        context
      );
    }

    return product;
  };
```

Because `TransactionManager` uses `AsyncLocalStorage`, nested script executions reuse the same transaction.

## Type Definitions

### Full Type Exports

```typescript
import type {
  // Core types
  Logger,
  BaseKernelServices,
  KernelServices,
  TransactionScript,
  ScriptContext,
  ScriptResult,

  // Kernel configuration
  KernelConfig,
} from "@shopana/shared-kernel";
```

### Logger Interface

```typescript
interface Logger {
  info(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  debug(obj: object, msg?: string): void;
  trace(obj: object, msg?: string): void;
}
```

## Best Practices

### 1. Keep Scripts Focused

Each script should do one thing well:

```typescript
// Good: focused scripts
const createProduct = async (params, services) => { ... };
const addStockLevel = async (params, services) => { ... };
const updateProductPrice = async (params, services) => { ... };

// Bad: script doing too much
const createProductWithStockAndPrice = async (params, services) => { ... };
```

### 2. Use Services, Not Direct Dependencies

```typescript
// Good: uses injected services
const getProduct = async (params, services) => {
  return services.repository.product.findById(params.id);
};

// Bad: direct import
import { productRepository } from "./repository";
const getProduct = async (params) => {
  return productRepository.findById(params.id);
};
```

### 3. Handle Errors Appropriately

```typescript
const reserveStock = async (params, services) => {
  const stock = await services.repository.stockLevel.get(params.productId);

  if (!stock) {
    throw new KernelError("Stock not found", "STOCK_NOT_FOUND", {
      productId: params.productId,
    });
  }

  if (stock.available < params.quantity) {
    throw new FatalError("Insufficient stock", undefined, "INSUFFICIENT_STOCK");
  }

  return services.repository.stockLevel.reserve(params);
};
```

### 4. Log with Context

```typescript
const processOrder = async (params, services, context) => {
  services.logger.info({
    requestId: context?.requestId,
    orderId: params.orderId,
    items: params.items.length,
  }, "Starting order processing");

  // ... processing

  services.logger.info({
    requestId: context?.requestId,
    orderId: params.orderId,
    duration: Date.now() - context.startTime,
  }, "Order processing completed");
};
```

## Related

- [[shared-kernel/service-broker]] — ServiceBroker for inter-service calls
- [[shared-kernel/transaction-manager]] — Transaction management details
- [[shared-kernel/errors]] — Error classes for scripts
