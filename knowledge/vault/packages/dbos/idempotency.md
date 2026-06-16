---
tags:
  - dbos
  - idempotency
  - deduplication
  - workflow-id
related:
  - dbos/index
  - dbos/registry
---
# Idempotency

Deterministic workflow IDs prevent duplicate execution.

## Overview

Idempotent execution ensures that starting the same workflow multiple times with the same idempotency context results in only one execution. DBOS uses the workflow ID as the deduplication key.

`@shopana/dbos` provides three idempotency strategies:

| Strategy | Use Case | Key Components |
|----------|----------|----------------|
| `client` | External API requests | Client-provided key, tenant, API key |
| `workflow` | Service-initiated workflows | Parent workflow ID, step ID |
| `content` | Content-based deduplication | Resource ID, operation, content hash |

## Client Idempotency

For external API requests with `Idempotency-Key` header:

```typescript
const handle = await registry.start("orders.createOrder", input, {
  source: "client",
  clientKey: req.headers["idempotency-key"],  // Client-provided key
  tenantId: ctx.organizationId,                // Tenant isolation
  apiKeyId: ctx.apiKey.id,                     // API key isolation
});
```

### Generated ID Format

```
client:{sha256(v1:client:tenantId:apiKeyId:workflowName:clientKey)}
```

### Use Cases

- REST API endpoints with Idempotency-Key header
- GraphQL mutations with client-provided deduplication key
- Webhook handlers with external event IDs

### Example: REST API

```typescript
@Post("orders")
async createOrder(
  @Body() input: OrderInput,
  @Headers("idempotency-key") idempotencyKey: string,
  @Req() req: AuthenticatedRequest,
) {
  if (!idempotencyKey) {
    throw new BadRequestException("Idempotency-Key header required");
  }

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

  return { workflowId: handle.workflowId };
}
```

### Interface

```typescript
interface ClientIdempotencyContext {
  source: "client";
  clientKey: string;      // Client-provided idempotency key
  tenantId: string;       // Tenant/organization ID
  apiKeyId: string;       // API key ID
}
```

## Workflow Idempotency

For service-initiated workflows (child workflows, event handlers):

```typescript
const handle = await registry.start("inventory.syncStock", input, {
  source: "workflow",
  workflowId: parentWorkflowId,    // Parent workflow ID
  stepId: "syncInventory",          // Step name
  callId: itemId,                   // Unique for fan-out
  tenantId: ctx.organizationId,     // Optional tenant isolation
});
```

### Generated ID Format

```
workflow:{sha256(v1:workflow:tenantId:workflowId:stepId:callId:workflowName)}
```

### Use Cases

- Child workflows called from parent workflow steps
- Fan-out patterns (processing multiple items)
- Event handler workflow triggers

### Example: Parent-Child Workflow

```typescript
@Workflow("processOrder")
async run(input: OrderInput): Promise<OrderResult> {
  const orderId = await this.createOrder(input);

  // Child workflow for each item (fan-out)
  for (const item of input.items) {
    await this.registry.start(
      "inventory.reserveItem",
      { productId: item.productId, quantity: item.quantity },
      {
        source: "workflow",
        workflowId: getSagaContext().sagaId,  // This workflow's ID
        stepId: "reserveItem",
        callId: item.productId,               // Unique per item
        tenantId: input.organizationId,
      }
    );
  }

  return { orderId };
}
```

### Interface

```typescript
interface WorkflowIdempotencyContext {
  source: "workflow";
  workflowId: string;     // Parent workflow ID
  stepId: string;         // Step identifier
  callId?: string;        // Call-specific ID (for fan-out)
  tenantId?: string;      // Optional tenant isolation
}
```

## Content Idempotency

For idempotent updates (same content = same operation):

```typescript
const handle = await registry.start("catalog.updateProduct", input, {
  source: "content",
  resourceId: input.productId,     // Resource being updated
  operation: "updateProduct",      // Operation name
  content: input,                  // Content to hash
  tenantId: ctx.organizationId,    // Optional tenant isolation
});
```

### Generated ID Format

```
content:{sha256(v1:content:tenantId:resourceId:operation:contentHash:workflowName)}
```

### Use Cases

- Idempotent update operations
- Import/sync workflows with same data
- Retry-safe mutations

### Example: Product Update

```typescript
@Mutation()
async productUpdate(
  @Args("id") id: string,
  @Args("input") input: ProductUpdateInput,
  @Context() ctx: GraphQLContext,
): Promise<ProductUpdatePayload> {
  const handle = await this.registry.start<ProductUpdateInput, ProductResult>(
    "catalog.updateProduct",
    { id, ...input },
    {
      source: "content",
      resourceId: id,
      operation: "updateProduct",
      content: input,
      tenantId: ctx.organizationId,
    }
  );

  return { workflowId: handle.workflowId };
}
```

### Interface

```typescript
interface ContentIdempotencyContext {
  source: "content";
  resourceId: string;         // Resource identifier
  operation: string;          // Operation name
  content: unknown;           // Content to hash
  tenantId?: string;          // Optional tenant isolation
}
```

## Hash Content Helper

For manual content hashing:

```typescript
import { hashContent } from "@shopana/dbos";

const contentHash = hashContent({
  sku: "ABC-123",
  price: 100,
  description: "Updated description",
});
// Returns: SHA256 of canonicalized JSON
```

### Canonicalization

Content is canonicalized before hashing:
- Objects keys sorted alphabetically
- Undefined values removed
- Consistent JSON serialization

```typescript
// These produce the same hash:
hashContent({ b: 2, a: 1 });
hashContent({ a: 1, b: 2 });

// Different hashes:
hashContent({ a: 1 });
hashContent({ a: 2 });
```

## IdempotencyContext Union

```typescript
type IdempotencyContext =
  | ClientIdempotencyContext
  | WorkflowIdempotencyContext
  | ContentIdempotencyContext;
```

## Choosing a Strategy

| Scenario | Strategy | Reason |
|----------|----------|--------|
| REST API with Idempotency-Key | `client` | Client controls deduplication |
| GraphQL mutation | `client` | Use request ID or custom header |
| Child workflow | `workflow` | Parent provides context |
| Fan-out processing | `workflow` | Use callId for each item |
| Event handler | `content` | Event content determines uniqueness |
| Data import | `content` | Same data = same operation |
| Scheduled job | `content` | Job parameters determine uniqueness |

## Tenant Isolation

All strategies support optional tenant isolation:

```typescript
// With tenant isolation
{
  source: "client",
  clientKey: "key-123",
  tenantId: "org_abc",      // Workflow ID includes tenant
  apiKeyId: "api_xyz",
}

// Same key, different tenant = different workflow
{
  source: "client",
  clientKey: "key-123",      // Same key
  tenantId: "org_def",       // Different tenant
  apiKeyId: "api_xyz",
}
// These create TWO separate workflows
```

## Best Practices

### 1. Always Provide Idempotency Context

```typescript
// BAD: No idempotency context
await registry.start("orders.createOrder", input);

// GOOD: Explicit idempotency
await registry.start("orders.createOrder", input, {
  source: "client",
  clientKey: idempotencyKey,
  tenantId: orgId,
  apiKeyId: apiKeyId,
});
```

### 2. Use Appropriate Strategy

```typescript
// API request → client
await registry.start("orders.create", input, {
  source: "client",
  clientKey: headers["idempotency-key"],
  ...
});

// Child workflow → workflow
await registry.start("inventory.reserve", input, {
  source: "workflow",
  workflowId: parentId,
  stepId: "reserve",
  ...
});

// Data sync → content
await registry.start("catalog.sync", input, {
  source: "content",
  resourceId: productId,
  operation: "sync",
  content: productData,
  ...
});
```

### 3. Include Tenant for Multi-Tenancy

```typescript
// Multi-tenant application
await registry.start("orders.create", input, {
  source: "client",
  clientKey: key,
  tenantId: ctx.organizationId,  // Always include
  apiKeyId: ctx.apiKey.id,
});
```

### 4. Use Unique callId for Fan-Out

```typescript
// Processing multiple items
for (const item of items) {
  await registry.start("process.item", { item }, {
    source: "workflow",
    workflowId: parentId,
    stepId: "processItem",
    callId: item.id,  // Unique per item
  });
}
```

## Related

- [[dbos/index]] — Package overview
- [[dbos/registry]] — WorkflowRegistry API
- [[dbos/workflows]] — Workflow implementation
- [[dbos/sagas]] — Saga implementation
