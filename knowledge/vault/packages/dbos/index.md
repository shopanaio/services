---
tags:
  - package
  - dbos
  - workflow
  - saga
  - durable
  - nestjs
related:
  - shared-kernel/index
  - shared-kernel/service-broker
---
# @shopana/dbos

Durable workflow and saga framework built on DBOS SDK with automatic compensation and idempotent execution.

## Overview

`@shopana/dbos` provides a high-level abstraction over DBOS SDK for building durable workflows and sagas in NestJS applications.

### Key Features

| Feature | Description |
|---------|-------------|
| **Durable execution** | Workflows survive crashes and resume from last checkpoint |
| **Sagas with compensation** | Automatic rollback of completed steps on failure |
| **Idempotent operations** | Deterministic workflow IDs prevent duplicate execution |
| **Retry policies** | Configurable retry with exponential backoff |
| **NestJS integration** | Decorators and module for seamless DI |

## Documentation

| Topic | Description |
|-------|-------------|
| [[dbos/workflows]] | BaseWorkflow, @Workflow, @WorkflowStep decorators |
| [[dbos/sagas]] | BaseSaga, @Saga, @SagaStep, automatic compensation |
| [[dbos/registry]] | WorkflowRegistry for starting and monitoring workflows |
| [[dbos/idempotency]] | Three idempotency strategies (client, workflow, content) |
| [[dbos/errors]] | Error classes, retry policies, timeouts |

## DBOS SDK

[DBOS SDK](https://docs.dbos.dev/) provides durable execution by persisting workflow state to PostgreSQL. When a workflow fails or the process crashes, DBOS replays the workflow from the last checkpoint.

Key DBOS concepts:

| Concept | Description |
|---------|-------------|
| **Workflow** | A function whose execution state is persisted |
| **Step** | A unit of work within a workflow (deterministic replay) |
| **Workflow ID** | Unique identifier for idempotent execution |

## Workflows vs Sagas

| Feature | Workflow | Saga |
|---------|----------|------|
| Compensation | Manual | Automatic |
| Failure handling | Custom | Reverse compensation |
| Use case | Simple sequences | Distributed transactions |
| Decorator | `@Workflow` | `@Saga` |
| Base class | `BaseWorkflow` | `BaseSaga` |

## Installation

```typescript
import {
  WorkflowModule,
  WorkflowRegistry,
  BaseWorkflow,
  BaseSaga,
  Workflow,
  WorkflowStep,
  Saga,
  SagaStep,
} from "@shopana/dbos";
```

## NestJS Module

Configure DBOS connection in your app module:

```typescript
import { WorkflowModule } from "@shopana/dbos";

@Module({
  imports: [
    WorkflowModule.forRoot({
      databaseUrl: process.env.DBOS_DATABASE_URL,
      name: "shopana",     // Application name
      schema: "dbos",      // PostgreSQL schema for system tables
    }),
  ],
})
export class AppModule {}
```

The module:
- Initializes DBOS on module init (`DBOS.launch()`)
- Provides `WorkflowRegistry` as global injectable
- Shuts down DBOS on module destroy (`DBOS.shutdown()`)

## Quick Example

```typescript
import { BaseSaga, Saga, SagaStep, WorkflowRegistry } from "@shopana/dbos";

@Injectable()
class OrderSaga extends BaseSaga<OrderInput, OrderResult> {
  constructor(registry: WorkflowRegistry) {
    super(registry, "orders");
  }

  @Saga("createOrder")
  async run(input: OrderInput): Promise<OrderResult> {
    const reservation = await this.reserveInventory(input);
    const payment = await this.processPayment(input, reservation);
    return { orderId: payment.orderId };
  }

  @SagaStep()
  private async reserveInventory(input: OrderInput): Promise<Reservation> {
    return this.inventoryService.reserve(input.items);
  }

  // Compensation: called if later step fails
  private async compensateReserveInventory(input: OrderInput): Promise<void> {
    await this.inventoryService.release(input.items);
  }

  @SagaStep()
  private async processPayment(input: OrderInput, reservation: Reservation): Promise<Payment> {
    return this.paymentService.charge(input.paymentMethod, reservation.total);
  }

  private async compensateProcessPayment(input: OrderInput, reservation: Reservation): Promise<void> {
    await this.paymentService.refund(input.paymentMethod);
  }
}
```

## Type Exports

```typescript
// Core types
import type {
  OperationError,
  OperationResult,
  RetryPolicy,
  WorkflowStatus,
  WorkflowResult,
  WorkflowHandle,
  WorkflowStartOptions,
  SagaStatus,
  SagaResult,
  StepResult,
  SagaStepConfig,
  SagaExecutorConfig,
  OnCompensationExhausted,
  WorkflowModuleConfig,
} from "@shopana/dbos";

// Idempotency types
import type {
  IdempotencyContext,
  ClientIdempotencyContext,
  WorkflowIdempotencyContext,
  ContentIdempotencyContext,
} from "@shopana/dbos";
```

## Related

- [[shared-kernel/service-broker]] — Broker integration for workflows
- [[shared-kernel/base-classes]] — BrokerWorkflows, BrokerSaga base classes
