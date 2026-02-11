---
tags:
  - package
  - shared-kernel
  - microkernel
  - nestjs
related:
  - dbos
  - rbac
  - drizzle-query
  - type-resolver
---
# @shopana/shared-kernel

Microkernel architecture with Transaction Script pattern for Shopana microservices.

## Overview

`@shopana/shared-kernel` provides the foundational infrastructure for all Shopana microservices. It implements a microkernel architecture where services register actions with a central broker, and business logic is organized as transaction scripts executed within managed database transactions.

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Microkernel** | Central service container with transaction script execution |
| **Service Broker** | In-process service communication and action registry |
| **Transaction Manager** | AsyncLocalStorage-based transaction handling |
| **Database Module** | PostgreSQL connection pooling with Drizzle ORM |
| **Decorators** | `@Action`, `@Policy`, `@ZodSchema` for declarative configuration |
| **Workflow/Saga** | Re-exports from `@shopana/dbos` with broker integration |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Service Module                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Actions    │    │   Workflows  │    │    Sagas     │       │
│  │ (BrokerActions)│  │(BrokerWorkflows)│ │ (BrokerSaga) │       │
│  └───────┬──────┘    └───────┬──────┘    └───────┬──────┘       │
│          │                   │                   │               │
│          └───────────────────┼───────────────────┘               │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    ServiceBroker                          │   │
│  │  - Action registration & resolution                       │   │
│  │  - Inter-service calls (broker.call)                      │   │
│  │  - Workflow/Saga execution                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                       Kernel                              │   │
│  │  - Transaction script execution                           │   │
│  │  - Service container (broker, logger, repository)         │   │
│  │  - Automatic transaction management                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                TransactionManager                         │   │
│  │  - AsyncLocalStorage for tx propagation                   │   │
│  │  - Automatic COMMIT/ROLLBACK                              │   │
│  │  - Nested transaction support (reuse)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  DatabaseModule                           │   │
│  │  - postgres.js connection pool                            │   │
│  │  - Drizzle ORM integration                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Documentation

| Topic | Description |
|-------|-------------|
| [[shared-kernel/nestjs-modules]] | NestJS module configuration (BrokerCoreModule, BrokerModule, DatabaseModule, WorkflowModule) |
| [[shared-kernel/kernel]] | Microkernel class and transaction script execution |
| [[shared-kernel/service-broker]] | Inter-service communication and action registry |
| [[shared-kernel/transaction-manager]] | Transaction management with AsyncLocalStorage |
| [[shared-kernel/decorators]] | Declarative decorators (@Action, @ZodSchema, @Policy, @EventHandler) |
| [[shared-kernel/base-classes]] | Base classes for actions, event handlers, workflows, and sagas |
| [[shared-kernel/errors]] | Error classes (KernelError, ValidationError, AuthorizationError) |
| [[shared-kernel/logging]] | Logging utilities (NestLogger, BootstrapLogger) |

## Quick Start

```typescript
// 1. Import modules in bootstrap
import { BrokerCoreModule, DatabaseModule, WorkflowModule } from "@shopana/shared-kernel";

@Module({
  imports: [
    BrokerCoreModule.forRoot(),
    DatabaseModule.forRoot({ db: { ... }, pool: { ... } }),
    WorkflowModule.forRoot({ databaseUrl: "...", name: "shopana" }),
  ],
})
export class BootstrapModule {}

// 2. Create feature module
@Module({
  imports: [BrokerModule.forFeature({ serviceName: "inventory" })],
  providers: [InventoryActions, InventoryRepository],
})
export class InventoryModule {}

// 3. Define actions
@Injectable()
class InventoryActions extends BrokerActions {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  @Action("getStock")
  async getStock(params: { productId: string }) {
    return this.repository.getStockLevel(params.productId);
  }
}
```

## Related

- [[dbos]] — Durable workflow/saga engine
- [[rbac]] — Authorization system
- [[drizzle-query]] — Query builder for repositories
- [[type-resolver]] — GraphQL resolver framework
