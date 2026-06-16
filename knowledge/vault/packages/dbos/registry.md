---
tags:
  - dbos
  - registry
  - workflow-handle
  - execution
related:
  - dbos/index
  - dbos/workflows
  - dbos/sagas
  - dbos/idempotency
---
# WorkflowRegistry

Central registry for starting and monitoring workflows.

## Overview

`WorkflowRegistry` is a global NestJS injectable that manages all registered workflows and sagas. It provides methods to start workflows, retrieve handles, and query workflow status.

## Injection

```typescript
import { Injectable } from "@nestjs/common";
import { WorkflowRegistry } from "@shopana/dbos";

@Injectable()
class OrderService {
  constructor(private readonly registry: WorkflowRegistry) {}
}
```

## Starting Workflows

### start()

Start a workflow and return a handle immediately:

```typescript
const handle = await registry.start<TInput, TOutput>(
  name: string,
  params: TInput,
  idempotencyContext: IdempotencyContext
): Promise<WorkflowHandle<TOutput>>
```

**Example:**

```typescript
const handle = await this.registry.start<OrderInput, SagaResult<OrderResult>>(
  "orders.createOrder",
  orderInput,
  {
    source: "client",
    clientKey: req.headers["idempotency-key"],
    tenantId: ctx.organizationId,
    apiKeyId: ctx.apiKey.id,
  }
);

// Return immediately with workflow ID
return { workflowId: handle.workflowId };
```

### run()

Start a workflow and wait for completion:

```typescript
const result = await registry.run<TInput, TOutput>(
  name: string,
  params: TInput,
  idempotencyContext: IdempotencyContext
): Promise<TOutput>
```

**Example:**

```typescript
const result = await this.registry.run<OrderInput, SagaResult<OrderResult>>(
  "orders.createOrder",
  orderInput,
  {
    source: "workflow",
    workflowId: parentWorkflowId,
    stepId: "createOrder",
  }
);

if (result.success) {
  console.log("Order created:", result.data.orderId);
}
```

## WorkflowHandle

Handle for monitoring workflow execution:

```typescript
interface WorkflowHandle<TResult> {
  workflowId: string;
  getResult(): Promise<TResult>;
  getStatus(): Promise<DBOSWorkflowStatus | null>;
}
```

### getResult()

Wait for workflow completion and return result:

```typescript
const handle = await registry.start("orders.createOrder", input, ctx);

// Non-blocking: continue with other work
doOtherWork();

// Block until completion
const result = await handle.getResult();
```

### getStatus()

Get current workflow status:

```typescript
const handle = registry.retrieve<OrderResult>(workflowId);
const status = await handle.getStatus();

console.log(status?.status);
// "PENDING" | "SUCCESS" | "ERROR" | "RETRIES_EXCEEDED" | "CANCELLED"
```

## Retrieving Workflows

### retrieve()

Get handle to existing workflow by ID:

```typescript
const handle = registry.retrieve<TResult>(workflowId: string): WorkflowHandle<TResult>
```

**Example:**

```typescript
@Get(":workflowId/status")
async getStatus(@Param("workflowId") workflowId: string) {
  const handle = this.registry.retrieve<SagaResult<OrderResult>>(workflowId);
  const status = await handle.getStatus();

  return {
    workflowId,
    status: status?.status ?? "UNKNOWN",
  };
}

@Get(":workflowId/result")
async getResult(@Param("workflowId") workflowId: string) {
  const handle = this.registry.retrieve<SagaResult<OrderResult>>(workflowId);
  return handle.getResult();  // Waits for completion
}
```

## Registry Methods

| Method | Description |
|--------|-------------|
| `start(name, params, ctx)` | Start workflow, return handle |
| `run(name, params, ctx)` | Start and await result |
| `retrieve(workflowId)` | Get handle to existing workflow |
| `has(name)` | Check if workflow is registered |
| `list()` | Get list of registered workflow names |

### has()

Check if workflow is registered:

```typescript
if (registry.has("orders.createOrder")) {
  await registry.start("orders.createOrder", input, ctx);
} else {
  throw new Error("Order workflow not registered");
}
```

### list()

Get all registered workflow names:

```typescript
const workflows = registry.list();
console.log(workflows);
// ["orders.createOrder", "orders.cancelOrder", "inventory.syncStock", ...]
```

## Workflow Status

DBOS workflow statuses:

| Status | Description |
|--------|-------------|
| `PENDING` | Workflow queued, not yet started |
| `SUCCESS` | Workflow completed successfully |
| `ERROR` | Workflow failed with error |
| `RETRIES_EXCEEDED` | Max retries exhausted |
| `CANCELLED` | Workflow was cancelled |

## Controller Pattern

Common pattern for exposing workflow operations via REST API:

```typescript
@Controller("orders")
export class OrdersController {
  constructor(private readonly registry: WorkflowRegistry) {}

  @Post()
  async createOrder(
    @Body() input: OrderInput,
    @Headers("idempotency-key") idempotencyKey: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const handle = await this.registry.start<OrderInput, SagaResult<OrderResult>>(
      "orders.createOrder",
      input,
      {
        source: "client",
        clientKey: idempotencyKey,
        tenantId: req.user.organizationId,
        apiKeyId: req.apiKey.id,
      }
    );

    return {
      workflowId: handle.workflowId,
      status: "PENDING",
    };
  }

  @Get(":workflowId")
  async getWorkflow(@Param("workflowId") workflowId: string) {
    const handle = this.registry.retrieve<SagaResult<OrderResult>>(workflowId);
    const status = await handle.getStatus();

    if (!status) {
      throw new NotFoundException("Workflow not found");
    }

    return {
      workflowId,
      status: status.status,
      // Don't include result unless completed
      ...(status.status === "SUCCESS" && {
        result: await handle.getResult(),
      }),
    };
  }

  @Get(":workflowId/await")
  async awaitWorkflow(@Param("workflowId") workflowId: string) {
    const handle = this.registry.retrieve<SagaResult<OrderResult>>(workflowId);

    // Long-poll: wait for completion
    const result = await handle.getResult();

    return {
      workflowId,
      status: result.success ? "SUCCESS" : "ERROR",
      result,
    };
  }
}
```

## GraphQL Pattern

Using with GraphQL resolvers:

```typescript
@Resolver()
class OrderMutationResolver {
  constructor(private readonly registry: WorkflowRegistry) {}

  @Mutation()
  async orderCreate(
    @Args("input") input: OrderInput,
    @Context() ctx: GraphQLContext,
  ): Promise<OrderCreatePayload> {
    const handle = await this.registry.start<OrderInput, SagaResult<OrderResult>>(
      "orders.createOrder",
      input,
      {
        source: "client",
        clientKey: ctx.idempotencyKey,
        tenantId: ctx.organizationId,
        apiKeyId: ctx.apiKeyId,
      }
    );

    return {
      workflowId: handle.workflowId,
      userErrors: [],
    };
  }
}

@Resolver("OrderWorkflow")
class OrderWorkflowResolver {
  constructor(private readonly registry: WorkflowRegistry) {}

  @ResolveField()
  async status(@Parent() workflow: { workflowId: string }): Promise<string> {
    const handle = this.registry.retrieve(workflow.workflowId);
    const status = await handle.getStatus();
    return status?.status ?? "UNKNOWN";
  }

  @ResolveField()
  async result(@Parent() workflow: { workflowId: string }): Promise<OrderResult | null> {
    const handle = this.registry.retrieve<SagaResult<OrderResult>>(workflow.workflowId);
    const status = await handle.getStatus();

    if (status?.status !== "SUCCESS") {
      return null;
    }

    const result = await handle.getResult();
    return result.success ? result.data : null;
  }
}
```

## Event Handler Pattern

Starting workflows from event handlers:

```typescript
@Injectable()
class OrderEventHandlers extends EventHandlers {
  constructor(
    @InjectBroker("orders") broker: ServiceBroker,
    private readonly registry: WorkflowRegistry,
  ) {
    super(broker);
  }

  @EventHandler("payment.succeeded")
  async onPaymentSucceeded(event: PaymentSucceededEvent): Promise<void> {
    await this.registry.start(
      "orders.fulfillOrder",
      { orderId: event.orderId },
      {
        source: "content",
        resourceId: event.orderId,
        operation: "fulfill",
      }
    );
  }

  @EventHandler("order.cancelled")
  async onOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    await this.registry.run(
      "orders.processRefund",
      { orderId: event.orderId, reason: event.reason },
      {
        source: "content",
        resourceId: event.orderId,
        operation: "refund",
      }
    );
  }
}
```

## Related

- [[dbos/index]] — Package overview
- [[dbos/idempotency]] — Idempotency context strategies
- [[dbos/workflows]] — Workflow implementation
- [[dbos/sagas]] — Saga implementation
