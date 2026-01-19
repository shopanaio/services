# DBOS Workflow Idempotency Architecture (v4 - Simplified)

**Author**: Generated from existing codebase patterns
**Date**: 2025-01-18
**Last Updated**: 2025-01-20

## Overview

This document describes a **simplified** idempotency architecture that leverages DBOS's built-in workflow idempotency instead of maintaining a separate `processed_requests` table.

### Design Principles

1. **DBOS is the single source of truth** — no separate idempotency tracking
2. **WorkflowID = Idempotency Key** — all idempotency flows through DBOS
3. **Client keys map to workflow IDs** — external clients can provide idempotency keys
4. **Domain logic should be naturally idempotent** — use UPSERT, unique constraints
5. **Minimal infrastructure** — no extra tables, no extra cleanup jobs

### Key Insight

DBOS already provides robust idempotency:

```typescript
// Same workflowID = same execution
const handle = await DBOS.startWorkflow(MyWorkflow, { workflowID: "order:create:org-123:abc" });
const result = await handle.run(input);

// Second call with same workflowID returns cached result
const handle2 = await DBOS.startWorkflow(MyWorkflow, { workflowID: "order:create:org-123:abc" });
const result2 = await handle2.run(input); // Returns same result, no re-execution
```

Additionally, `@DBOS.step()` methods are recorded and replayed on workflow restart.

---

## Part 1: Idempotency Key Sources

### Three Key Sources

```
┌─────────────────────────────────────────────────────────────────┐
│                    Idempotency Key Sources                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CLIENT-PROVIDED (External API)                              │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  Header: Idempotency-Key: "user-provided-key-123"   │     │
│     │  → workflowID: client:{projectId}:{clientKey}       │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                 │
│  2. WORKFLOW-DERIVED (Service-Initiated)                        │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  Deterministic from business input                  │     │
│     │  → workflowID: store:create:{orgId}:{storeName}     │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                 │
│  3. EVENT-DERIVED (Event Handlers)                              │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  Derived from event ID                              │     │
│     │  → workflowID: event:{eventType}:{eventId}          │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.1 Client-Provided Keys (External API)

Like Stripe's `Idempotency-Key` header, mapped to DBOS workflowID:

```typescript
// GraphQL resolver
@Mutation(() => Order)
async createOrder(
  @Ctx() ctx: Context,
  @Arg("input") input: CreateOrderInput
): Promise<Order> {
  const clientKey = ctx.request.headers.get("idempotency-key");

  const workflowID = clientKey
    ? buildClientWorkflowID(ctx.auth.projectId, "createOrder", clientKey)
    : buildUniqueWorkflowID("order", "create");

  const result = await DBOS.startWorkflow(CreateOrderWorkflow, { workflowID })
    .run(input);

  return result.order;
}

// Helper functions
function buildClientWorkflowID(projectId: string, operation: string, clientKey: string): string {
  return `client:${projectId}:${operation}:${clientKey}`;
}

function buildUniqueWorkflowID(entity: string, action: string): string {
  return `${entity}:${action}:${crypto.randomUUID()}`;
}
```

### 1.2 Workflow-Derived Keys (Service-Initiated)

For background jobs, workflows initiated by the system:

```typescript
export class StoreCreateWorkflow {
  /**
   * Deterministic workflow ID from business input.
   * Same org + same store name = same workflow ID = idempotent.
   */
  static workflowID(input: StoreCreateInput): string {
    const normalizedName = input.name.trim().toLowerCase().normalize("NFKC");
    return `store:create:${input.organizationId}:${normalizedName}`;
  }

  static async start(input: StoreCreateInput): Promise<StoreCreateResult> {
    const workflowID = StoreCreateWorkflow.workflowID(input);
    const handle = await DBOS.startWorkflow(StoreCreateWorkflow, { workflowID });
    return handle.run(input);
  }
}
```

### 1.3 Event-Derived Keys

For event handlers, derived from event ID:

```typescript
export class EventDispatchWorkflow {
  static workflowID(event: DomainEvent): string {
    return `event:dispatch:${event.eventType}:${event.eventId}`;
  }

  static async start(event: DomainEvent): Promise<EventDispatchResult> {
    const workflowID = EventDispatchWorkflow.workflowID(event);
    const handle = await DBOS.startWorkflow(EventDispatchWorkflow, { workflowID });
    return handle.dispatch(event);
  }
}
```

---

## Part 2: DBOS Step Idempotency

### How @DBOS.step() Works

DBOS automatically records step results:

```typescript
@DBOS.workflow()
async run(input: StoreCreateInput): Promise<StoreCreateResult> {
  // Step 1: Create store (recorded by DBOS)
  const store = await this.createStore(input);

  // Step 2: Create roles (recorded by DBOS)
  await this.createRoles(store.id, input.organizationId, input.userId);

  // Step 3: Create media group (recorded by DBOS)
  await this.createMediaAssetGroup(store.id);

  return { store };
}

@DBOS.step()
private async createStore(input: StoreCreateInput): Promise<Store> {
  // On first run: executes and records result
  // On replay: returns recorded result without re-executing
  return this.broker.call("project.createStore", input);
}

@DBOS.step()
private async createRoles(storeId: string, orgId: string, userId: string): Promise<void> {
  // Same behavior - recorded and replayed
  await this.broker.call("iam.createRoles", { storeId, orgId, userId });
}
```

### Replay Behavior

```
First Execution:
  Step 1: createStore → executes → records result
  Step 2: createRoles → executes → records result
  Step 3: createMediaAssetGroup → executes → records result
  ✅ Workflow completes

Crash & Restart (same workflowID):
  Step 1: createStore → returns recorded result (no execution)
  Step 2: createRoles → returns recorded result (no execution)
  Step 3: createMediaAssetGroup → returns recorded result (no execution)
  ✅ Workflow completes (idempotent)

Crash After Step 1:
  Step 1: createStore → returns recorded result (no execution)
  Step 2: createRoles → executes → records result
  Step 3: createMediaAssetGroup → executes → records result
  ✅ Workflow completes (partial replay)
```

---

## Part 3: Domain-Level Idempotency

### Why Domain Logic Must Be Idempotent

Even with DBOS step recording, you should design domain logic to be naturally idempotent:

1. **DBOS steps can retry** — if a step fails, DBOS may retry it
2. **External calls may succeed but DBOS may not record** — rare edge case
3. **Defense in depth** — multiple layers of protection

### Patterns for Idempotent Domain Logic

#### Pattern 1: UPSERT (Insert or Update)

```typescript
// In CreateRolesScript
async execute(params: CreateRolesParams): Promise<CreateRolesResult> {
  // Use ON CONFLICT to make insert idempotent
  await this.db.execute(sql`
    INSERT INTO roles (id, domain, name, permissions)
    VALUES (${roleId}, ${params.domain}, ${params.name}, ${params.permissions})
    ON CONFLICT (domain, name) DO UPDATE SET
      permissions = EXCLUDED.permissions,
      updated_at = NOW()
  `);
}
```

#### Pattern 2: Unique Constraints

```typescript
// Schema ensures no duplicates
CREATE UNIQUE INDEX idx_roles_domain_name ON roles(domain, name);

// Insert will fail on duplicate - script can handle gracefully
try {
  await this.db.insert(roles).values(newRole);
} catch (error) {
  if (isUniqueViolation(error)) {
    // Already exists - return existing
    return this.db.query.roles.findFirst({ where: eq(roles.domain, domain) });
  }
  throw error;
}
```

#### Pattern 3: Deterministic IDs

```typescript
// Generate ID deterministically from input
function generateRoleId(domain: string, roleName: string): string {
  return sha256(`role:${domain}:${roleName}`);
}

// Same input = same ID = UPSERT works correctly
const roleId = generateRoleId(params.domain, params.roleName);
await this.db.execute(sql`
  INSERT INTO roles (id, domain, name)
  VALUES (${roleId}, ${params.domain}, ${params.name})
  ON CONFLICT (id) DO NOTHING
`);
```

#### Pattern 4: Check-Then-Act with Constraints

```typescript
// Check if already exists
const existing = await this.db.query.assetGroups.findFirst({
  where: and(
    eq(assetGroups.ownerType, params.ownerType),
    eq(assetGroups.ownerId, params.ownerId)
  ),
});

if (existing) {
  return existing; // Already created - return it
}

// Create with unique constraint as safety net
await this.db.insert(assetGroups).values({
  ownerType: params.ownerType,
  ownerId: params.ownerId,
});
```

---

## Part 4: Error Handling

### ServiceError for Workflows

```typescript
export class ServiceError extends Error {
  public readonly retryable: boolean;

  constructor(
    public readonly service: string,
    public readonly action: string,
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
    retryable?: boolean
  ) {
    super(`[${service}.${action}] ${message}`);
    this.name = "ServiceError";
    this.retryable = retryable ?? code.startsWith("TRANSIENT_");
  }

  static transient(service: string, action: string, message: string, cause?: unknown): ServiceError {
    return new ServiceError(service, action, "TRANSIENT_ERROR", message, cause, true);
  }

  static validation(service: string, action: string, message: string): ServiceError {
    return new ServiceError(service, action, "VALIDATION_ERROR", message, undefined, false);
  }

  static notFound(service: string, action: string, message: string): ServiceError {
    return new ServiceError(service, action, "NOT_FOUND", message, undefined, false);
  }

  static conflict(service: string, action: string, message: string): ServiceError {
    return new ServiceError(service, action, "CONFLICT", message, undefined, false);
  }
}
```

### Step Retry Configuration

```typescript
@DBOS.step({
  maxAttempts: 3,
  intervalSeconds: 1,
  backoffRate: 2
})
private async createRoles(storeId: string): Promise<void> {
  const result = await this.broker.call("iam.createRoles", { storeId });

  if (result.userErrors?.length) {
    // Non-retryable error - throw without TRANSIENT prefix
    throw ServiceError.validation("iam", "createRoles", result.userErrors[0].message);
  }
}

@DBOS.step({ maxAttempts: 3 })
private async callExternalAPI(): Promise<void> {
  try {
    await fetch("https://external-api.com/...");
  } catch (error) {
    // Network error - retryable
    throw ServiceError.transient("external", "api", "Network error", error);
  }
}
```

---

## Part 5: Complete Workflow Example

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { ServiceBroker } from "@shopana/shared-kernel";
import { ServiceError } from "./errors.js";

export interface StoreCreateInput {
  name: string;
  organizationId: string;
  userId: string;
}

export interface StoreCreateResult {
  store: Store;
}

export class StoreCreateWorkflow {
  constructor(private readonly broker: ServiceBroker) {}

  /**
   * Deterministic workflow ID for idempotency.
   * Same org + same store name = same workflow.
   */
  static workflowID(input: StoreCreateInput): string {
    const normalizedName = input.name.trim().toLowerCase().normalize("NFKC");
    return `store:create:${input.organizationId}:${normalizedName}`;
  }

  /**
   * Start workflow with idempotent ID.
   */
  static async start(input: StoreCreateInput): Promise<StoreCreateResult> {
    const workflowID = StoreCreateWorkflow.workflowID(input);
    const handle = await DBOS.startWorkflow(StoreCreateWorkflow, { workflowID });
    return handle.run(input);
  }

  @DBOS.workflow()
  async run(input: StoreCreateInput): Promise<StoreCreateResult> {
    // Step 1: Create the store
    const store = await this.createStore(input);

    // Step 2: Create IAM roles for the store
    await this.createRoles(store.id, input.organizationId, input.userId);

    // Step 3: Create media asset group
    await this.createMediaAssetGroup(store.id);

    return { store };
  }

  @DBOS.step()
  private async createStore(input: StoreCreateInput): Promise<Store> {
    const result = await this.broker.call("project.createStore", {
      name: input.name,
      organizationId: input.organizationId,
    });

    if (result.userErrors?.length) {
      throw ServiceError.validation("project", "createStore", result.userErrors[0].message);
    }

    return result.store;
  }

  @DBOS.step({ maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 })
  private async createRoles(
    storeId: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    const result = await this.broker.call("iam.createRoles", {
      userId,
      organizationId,
      domain: `store:${storeId}`,
      roles: this.buildStoreRoles(),
    });

    if (result.userErrors?.length) {
      throw ServiceError.validation("iam", "createRoles", result.userErrors[0].message);
    }
  }

  @DBOS.step({ maxAttempts: 3 })
  private async createMediaAssetGroup(storeId: string): Promise<void> {
    const result = await this.broker.call("media.createAssetGroup", {
      ownerType: "store",
      ownerId: storeId,
    });

    // Non-critical - log warning but don't fail workflow
    if (result.userErrors?.length) {
      console.warn("Failed to create media asset group", {
        storeId,
        error: result.userErrors[0].message
      });
    }
  }

  private buildStoreRoles(): RoleDefinition[] {
    return [
      { name: "owner", permissions: ["*"] },
      { name: "admin", permissions: ["read", "write", "manage"] },
      { name: "editor", permissions: ["read", "write"] },
      { name: "viewer", permissions: ["read"] },
    ];
  }
}
```

---

## Part 6: API Layer Integration

### GraphQL with Client Idempotency Keys

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import crypto from "node:crypto";

// Middleware to extract idempotency key
const idempotencyMiddleware: MiddlewareFn = async ({ context }, next) => {
  const header = context.request.headers.get("idempotency-key");
  if (header) {
    context.idempotencyKey = header;
  }
  return next();
};

// Resolver
@Resolver()
export class OrderResolver {
  @Mutation(() => Order)
  @UseMiddleware(idempotencyMiddleware)
  async createOrder(
    @Ctx() ctx: Context,
    @Arg("input") input: CreateOrderInput
  ): Promise<Order> {
    const workflowID = ctx.idempotencyKey
      ? `client:${ctx.auth.projectId}:createOrder:${ctx.idempotencyKey}`
      : `order:create:${crypto.randomUUID()}`;

    const result = await DBOS.startWorkflow(CreateOrderWorkflow, { workflowID })
      .run({ ...input, projectId: ctx.auth.projectId });

    return result.order;
  }
}
```

### REST API Example

```typescript
app.post("/api/orders", async (req, res) => {
  const clientKey = req.headers["idempotency-key"];
  const projectId = req.auth.projectId;

  const workflowID = clientKey
    ? `client:${projectId}:createOrder:${clientKey}`
    : `order:create:${crypto.randomUUID()}`;

  try {
    const result = await DBOS.startWorkflow(CreateOrderWorkflow, { workflowID })
      .run(req.body);

    res.json(result.order);
  } catch (error) {
    if (error instanceof ServiceError) {
      res.status(error.retryable ? 503 : 400).json({
        error: error.message,
        code: error.code,
      });
    } else {
      res.status(500).json({ error: "Internal error" });
    }
  }
});
```

---

## Part 7: What We Removed (and Why It's OK)

### Removed Components

| Component | Purpose | Why Not Needed |
|-----------|---------|----------------|
| `processed_requests` table | Track idempotent requests | DBOS tracks workflow state |
| `IdempotencyRepository` | DB operations for tracking | Not needed |
| `withIdempotency()` helper | Wrap service calls | DBOS step recording |
| Lease mechanism | Prevent dual execution | DBOS handles internally |
| Cleanup job | Remove expired records | DBOS manages own state |
| `ActionContext` with payloadHash | Conflict detection | Not needed* |
| `broker.fire()` | Idempotent call method | Use `broker.call()` in steps |
| `@Fire` decorator | Register idempotent handlers | Not needed |

*Payload conflict detection is not needed if workflow IDs are derived correctly from business intent.

### What DBOS Provides

1. **Workflow-level idempotency** — same workflowID = same execution
2. **Step recording** — `@DBOS.step()` results are cached and replayed
3. **Automatic retries** — configurable per step
4. **Crash recovery** — workflows resume from last completed step
5. **Built-in state management** — no external table needed

---

## Part 8: When This Approach Works Best

### Ideal Use Cases

1. **All mutations go through workflows** — no direct service calls needing deduplication
2. **Deterministic workflow IDs** — can be computed from business input
3. **Domain logic is naturally idempotent** — UPSERT, unique constraints
4. **DBOS is the orchestration layer** — all durable execution via DBOS

### Potential Limitations

1. **No payload conflict detection** — same key with different payload returns first result
2. **Workflow startup overhead** — DBOS checks workflow state on every call
3. **Tied to DBOS** — idempotency is coupled to workflow framework

### Mitigation Strategies

For payload conflicts (if needed):
```typescript
// Include payload hash in workflow ID for strict deduplication
function buildStrictWorkflowID(projectId: string, operation: string, clientKey: string, payload: unknown): string {
  const payloadHash = sha256(JSON.stringify(payload)).slice(0, 8);
  return `client:${projectId}:${operation}:${clientKey}:${payloadHash}`;
}
```

---

## Summary

The simplified v4 approach:

1. **Use DBOS workflowID as the idempotency key** — no separate table
2. **Map client Idempotency-Key header to workflowID** — `client:{projectId}:{operation}:{key}`
3. **Derive workflow IDs deterministically** — same business input = same ID
4. **Make domain logic idempotent** — UPSERT, unique constraints, deterministic IDs
5. **Use @DBOS.step() for automatic recording** — results cached on replay
6. **Configure retries at step level** — `maxAttempts`, `intervalSeconds`, `backoffRate`

This eliminates complexity while maintaining robust idempotency guarantees through DBOS.
