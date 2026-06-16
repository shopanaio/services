---
tags:
  - shared-kernel
  - logging
  - pino
  - nestjs
related:
  - shared-kernel/index
  - shared-kernel/kernel
---
# Logging

Logging utilities for NestJS services and application bootstrap.

## Overview

| Logger | Purpose | Use Case |
|--------|---------|----------|
| `NestLogger` | Service logging | Runtime service operations |
| `BootstrapLogger` | Bootstrap logging | Application startup phase |

Both loggers implement the `Logger` interface expected by the Kernel.

## Logger Interface

```typescript
interface Logger {
  info(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  debug(obj: object, msg?: string): void;
  trace(obj: object, msg?: string): void;
}
```

This interface is compatible with Pino logger, which is the underlying implementation.

## NestLogger

Adapter for NestJS Logger that implements the Kernel Logger interface.

### Basic Usage

```typescript
import { NestLogger } from "@shopana/shared-kernel";

@Injectable()
class ProductService {
  private readonly logger = new NestLogger("ProductService");

  async create(input: CreateProductInput): Promise<Product> {
    this.logger.info({ input }, "Creating product");

    try {
      const product = await this.repository.create(input);
      this.logger.info({ productId: product.id }, "Product created");
      return product;
    } catch (error) {
      this.logger.error({ error: error.message, input }, "Failed to create product");
      throw error;
    }
  }
}
```

### With Request Context

```typescript
@Injectable()
class OrderService {
  private readonly logger = new NestLogger("OrderService");

  async processOrder(
    orderId: string,
    context: { requestId?: string; userId?: string }
  ): Promise<Order> {
    this.logger.info({
      requestId: context.requestId,
      userId: context.userId,
      orderId,
    }, "Processing order");

    // ... processing

    this.logger.info({
      requestId: context.requestId,
      orderId,
      status: "completed",
    }, "Order processed");
  }
}
```

### Log Levels

```typescript
const logger = new NestLogger("MyService");

// Debug: Detailed debugging information
logger.debug({ query, params }, "Executing database query");

// Info: General operational information
logger.info({ userId, action: "login" }, "User logged in");

// Warn: Warning conditions
logger.warn({ retryCount: 3, maxRetries: 5 }, "Retry limit approaching");

// Error: Error conditions
logger.error({ error: err.message, stack: err.stack }, "Operation failed");

// Trace: Very detailed trace information
logger.trace({ input, output }, "Function executed");
```

### In Kernel Services

```typescript
interface OrderServices extends BaseKernelServices {
  readonly repository: OrderRepository;
}

const processOrder: TransactionScript<OrderInput, Order, OrderServices> =
  async (params, services, context) => {
    const { logger, repository } = services;

    logger.info({
      requestId: context?.requestId,
      orderId: params.orderId,
    }, "Starting order processing");

    const order = await repository.findById(params.orderId);

    if (!order) {
      logger.warn({
        requestId: context?.requestId,
        orderId: params.orderId,
      }, "Order not found");
      throw new KernelError("Order not found", "ORDER_NOT_FOUND");
    }

    logger.info({
      requestId: context?.requestId,
      orderId: params.orderId,
      itemCount: order.items.length,
    }, "Order processing completed");

    return order;
  };
```

## BootstrapLogger

Logger for application bootstrap phase before NestJS DI is available.

### Basic Usage

```typescript
import { BootstrapLogger } from "@shopana/shared-kernel";

async function bootstrap() {
  const logger = new BootstrapLogger();

  logger.info("Starting application...");

  try {
    logger.info("Connecting to database...");
    await connectDatabase();
    logger.info("Database connected");

    logger.info("Starting HTTP server...");
    const app = await NestFactory.create(AppModule);
    await app.listen(3000);
    logger.info("Application started on port 3000");
  } catch (error) {
    logger.error("Failed to start application", error);
    process.exit(1);
  }
}
```

### With Context

```typescript
const logger = new BootstrapLogger();

logger.info("Loading configuration...");
const config = loadConfig();

logger.info("Configuration loaded", {
  environment: config.environment,
  port: config.port,
  database: config.database.host,
});

logger.info("Initializing modules...");
for (const module of config.modules) {
  logger.info(`Loading module: ${module.name}`);
  await module.initialize();
}
```

### Error Handling

```typescript
const logger = new BootstrapLogger();

try {
  await runMigrations();
} catch (error) {
  logger.error("Migration failed", error);

  if (error.code === "MIGRATION_LOCKED") {
    logger.warn("Another migration is in progress, waiting...");
    await sleep(5000);
    return bootstrap(); // Retry
  }

  throw error;
}
```

## Structured Logging Best Practices

### 1. Always Include Context

```typescript
// Good: includes relevant context
logger.info({
  requestId: "req_123",
  userId: "user_456",
  productId: "prod_789",
  action: "purchase",
}, "Purchase completed");

// Bad: no context
logger.info({}, "Purchase completed");
```

### 2. Use Consistent Field Names

```typescript
// Recommended field names
interface LogContext {
  requestId?: string;     // Correlation ID
  userId?: string;        // Current user
  organizationId?: string;// Organization/tenant
  projectId?: string;     // Project/store
  resourceId?: string;    // Resource being operated on
  action?: string;        // Action being performed
  duration?: number;      // Operation duration in ms
  error?: string;         // Error message
  stack?: string;         // Error stack trace
}
```

### 3. Log at Appropriate Levels

```typescript
// DEBUG: Internal details, development
logger.debug({ query: sql, params }, "Executing query");

// INFO: Business events, operations
logger.info({ orderId, status: "created" }, "Order created");

// WARN: Degraded service, approaching limits
logger.warn({ queueSize: 950, maxSize: 1000 }, "Queue nearly full");

// ERROR: Failures requiring attention
logger.error({ error: err.message, orderId }, "Payment failed");
```

### 4. Avoid Logging Sensitive Data

```typescript
// Bad: logs sensitive data
logger.info({ password, creditCard }, "User data");

// Good: redact sensitive fields
logger.info({
  email: user.email,
  hasPassword: !!user.password,
  cardLast4: card.last4,
}, "User data");
```

### 5. Include Timing Information

```typescript
async function processOrder(orderId: string): Promise<Order> {
  const startTime = Date.now();

  logger.info({ orderId }, "Starting order processing");

  const order = await doProcessing(orderId);

  const duration = Date.now() - startTime;
  logger.info({ orderId, duration }, "Order processing completed");

  return order;
}
```

## Integration with Kernel

The Kernel receives a logger in its constructor:

```typescript
import { Kernel, NestLogger } from "@shopana/shared-kernel";

const logger = new NestLogger("InventoryService");

const kernel = new Kernel<InventoryServices>(
  broker,
  logger,  // Logger instance
  {
    repository: inventoryRepository,
  }
);

// Logger is available in scripts via services.logger
await kernel.executeScript(async (params, services) => {
  services.logger.info({ productId: params.id }, "Getting product");
  return services.repository.findById(params.id);
}, { id: "prod_123" });
```

## Type Definitions

```typescript
import type { Logger } from "@shopana/shared-kernel";
import { NestLogger, BootstrapLogger } from "@shopana/shared-kernel";
```

## Related

- [[shared-kernel/index]] — Package overview
- [[shared-kernel/kernel]] — Kernel logger integration
