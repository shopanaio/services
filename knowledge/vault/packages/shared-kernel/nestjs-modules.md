---
tags:
  - shared-kernel
  - nestjs
  - module
  - dependency-injection
related:
  - shared-kernel/index
  - shared-kernel/service-broker
  - shared-kernel/kernel
  - dbos
---
# NestJS Modules

NestJS module configuration for shared-kernel infrastructure.

## Overview

The shared-kernel provides four main NestJS modules:

| Module | Scope | Purpose |
|--------|-------|---------|
| `BrokerCoreModule` | Global | Shared ActionRegistry for all services |
| `BrokerModule` | Feature | Service-specific ServiceBroker instance |
| `DatabaseModule` | Global | PostgreSQL connection pool with Drizzle ORM |
| `WorkflowModule` | Global | DBOS durable workflow engine |

## BrokerCoreModule

Global module providing shared `ActionRegistry`. Import once in the root module (usually `BootstrapModule`).

### Configuration

```typescript
import { BrokerCoreModule } from "@shopana/shared-kernel";

@Module({
  imports: [
    BrokerCoreModule.forRoot(),  // Global, import once
  ],
})
export class BootstrapModule {}
```

### What it provides

- **ActionRegistry** — Central registry for all service actions
- **WorkflowRegistry** — Registry for workflows and sagas (from `@shopana/dbos`)

The `ActionRegistry` is a singleton that stores all registered actions across services. When `BrokerModule.forFeature()` is imported, it uses this shared registry.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  BrokerCoreModule                   │
│                    (Global)                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │            ActionRegistry                  │      │
│  │  - Map<actionName, handler>                │      │
│  │  - Map<actionName, metadata>               │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │           WorkflowRegistry                 │      │
│  │  - Map<workflowName, handler>              │      │
│  │  - Map<sagaName, handler>                  │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## BrokerModule

Feature module providing service-specific `ServiceBroker`. Import in each service module.

### Configuration

```typescript
import { BrokerModule, InjectBroker, ServiceBroker } from "@shopana/shared-kernel";

@Module({
  imports: [
    BrokerModule.forFeature({ serviceName: "inventory" }),
  ],
  providers: [InventoryActions, InventoryService],
})
export class InventoryModule {}
```

### Injection

Use `@InjectBroker(serviceName)` decorator to inject the broker:

```typescript
import { Injectable } from "@nestjs/common";
import { InjectBroker, ServiceBroker } from "@shopana/shared-kernel";

@Injectable()
class InventoryService {
  constructor(
    @InjectBroker("inventory") private broker: ServiceBroker
  ) {}

  async reserveStock(productId: string, quantity: number) {
    // Call action in another service
    const product = await this.broker.call<Product>(
      "catalog.getProduct",
      { id: productId }
    );

    // ... reservation logic
  }
}
```

### Options

```typescript
interface BrokerModuleOptions {
  serviceName: string;  // Service identifier (e.g., "inventory", "catalog")
}
```

The `serviceName` is used as a prefix for action names. When you register action "getStock" in service "inventory", the full action name becomes "inventory.getStock".

## DatabaseModule

Global module providing PostgreSQL connection pool with Drizzle ORM integration.

### Configuration

```typescript
import { DatabaseModule } from "@shopana/shared-kernel";

@Module({
  imports: [
    DatabaseModule.forRoot({
      db: {
        host: "localhost",
        port: 5432,
        database: "shopana",
        username: "postgres",
        password: "password",
      },
      pool: {
        max: 20,           // Maximum connections
        idle_timeout: 20,  // Seconds before idle connection is closed
        connect_timeout: 30, // Connection timeout in seconds
      },
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
import { DatabaseModule } from "@shopana/shared-kernel";
import { ConfigService } from "@nestjs/config";

@Module({
  imports: [
    DatabaseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        db: {
          host: config.get("DB_HOST"),
          port: config.get("DB_PORT"),
          database: config.get("DB_NAME"),
          username: config.get("DB_USER"),
          password: config.get("DB_PASSWORD"),
        },
        pool: {
          max: config.get("DB_POOL_MAX", 20),
          idle_timeout: config.get("DB_IDLE_TIMEOUT", 20),
          connect_timeout: config.get("DB_CONNECT_TIMEOUT", 30),
        },
      }),
    }),
  ],
})
export class AppModule {}
```

### Injection

Use `@InjectDatabaseClient()` to inject the raw postgres.js client:

```typescript
import { InjectDatabaseClient, DatabaseClient } from "@shopana/shared-kernel";
import { drizzle } from "drizzle-orm/postgres-js";

@Injectable()
class ProductRepository {
  private db: DrizzleDatabase;

  constructor(@InjectDatabaseClient() client: DatabaseClient) {
    this.db = drizzle(client, { schema });
  }
}
```

### Options

```typescript
interface DatabaseModuleOptions {
  db: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean | object;
  };
  pool?: {
    max?: number;          // Default: 10
    idle_timeout?: number; // Default: 20
    connect_timeout?: number; // Default: 30
  };
}
```

## WorkflowModule

Global module providing DBOS durable workflow engine. Re-exported from `@shopana/dbos`.

### Configuration

```typescript
import { WorkflowModule } from "@shopana/shared-kernel";

@Module({
  imports: [
    WorkflowModule.forRoot({
      databaseUrl: process.env.DBOS_DATABASE_URL,
      name: "shopana",
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
import { WorkflowModule } from "@shopana/shared-kernel";
import { ConfigService } from "@nestjs/config";

@Module({
  imports: [
    WorkflowModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        databaseUrl: config.get("DBOS_DATABASE_URL"),
        name: config.get("DBOS_APP_NAME", "shopana"),
        debugMode: config.get("NODE_ENV") === "development",
      }),
    }),
  ],
})
export class AppModule {}
```

### Options

```typescript
interface WorkflowModuleOptions {
  databaseUrl: string;  // PostgreSQL connection string for DBOS
  name: string;         // Application name
  debugMode?: boolean;  // Enable debug logging
}
```

### Integration with Broker

The `WorkflowModule` integrates with `ServiceBroker` through the `WorkflowRegistry`. When you define workflows using `BrokerWorkflows` or sagas using `BrokerSaga`, they are automatically registered and can be executed via `broker.runWorkflow()` or `broker.runSaga()`.

```typescript
// Workflow execution via broker
await broker.runWorkflow<OrderResult>(
  "orders.createOrder",
  { items },
  { source: "workflow", workflowId: "parent-123", stepId: "createOrder" }
);

// Saga execution via broker
await broker.runSaga<OrderResult>(
  "orders.processOrder",
  { orderId },
  { source: "content", resourceId: orderId, operation: "processOrder" }
);
```

## Complete Bootstrap Example

```typescript
// bootstrap.module.ts
import {
  BrokerCoreModule,
  DatabaseModule,
  WorkflowModule,
} from "@shopana/shared-kernel";

@Module({
  imports: [
    // Global modules (import once)
    BrokerCoreModule.forRoot(),
    DatabaseModule.forRoot({
      db: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      },
      pool: { max: 20 },
    }),
    WorkflowModule.forRoot({
      databaseUrl: process.env.DBOS_DATABASE_URL,
      name: "shopana",
    }),

    // Feature modules
    CatalogModule,
    InventoryModule,
    OrdersModule,
  ],
})
export class BootstrapModule {}

// inventory.module.ts
import { BrokerModule } from "@shopana/shared-kernel";

@Module({
  imports: [
    BrokerModule.forFeature({ serviceName: "inventory" }),
  ],
  providers: [
    InventoryActions,
    InventoryEventHandlers,
    StockReservationWorkflow,
    InventoryRepository,
  ],
})
export class InventoryModule {}
```

## Related

- [[shared-kernel/service-broker]] — ServiceBroker API reference
- [[shared-kernel/kernel]] — Kernel and transaction scripts
- [[dbos]] — DBOS workflow engine details
