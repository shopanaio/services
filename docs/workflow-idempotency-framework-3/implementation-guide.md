# Implementation Guide: Simplified Idempotency & Event-Driven Architecture

**Author**: Implementation plan based on workflow-idempotency-plan.md v4
**Date**: 2026-01-19
**Last Updated**: 2026-01-20
**Approach**: DBOS-native, minimal infrastructure

## Overview

This guide provides step-by-step implementation of simplified idempotency using DBOS's built-in capabilities.

**Key Decision**: No separate idempotency table. DBOS workflowID = idempotency key.

```
broker.call()              → Used inside @DBOS.step() methods
DBOS.startWorkflow()       → Idempotency via workflowID
@DBOS.step()               → Automatic result recording & replay
```

---

## Phase 1: Core Types & Helpers

### Step 1.1: Create Shared Types Package

```bash
mkdir -p packages/workflows/src
```

**File: `packages/workflows/package.json`**

```json
{
  "name": "@shopana/workflows",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@dbos-inc/dbos-sdk": "^2.0.0"
  }
}
```

### Step 1.2: ServiceError Class

**File: `packages/workflows/src/errors.ts`**

```typescript
/**
 * Error class for service call failures in workflows.
 * Retryable errors have codes starting with TRANSIENT_.
 */
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

  static internal(service: string, action: string, message: string, cause?: unknown): ServiceError {
    return new ServiceError(service, action, "INTERNAL_ERROR", message, cause, false);
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}
```

### Step 1.3: Workflow ID Helpers

**File: `packages/workflows/src/workflowId.ts`**

```typescript
import crypto from "node:crypto";

/**
 * Build workflow ID for client-provided idempotency keys.
 * Maps Idempotency-Key header to DBOS workflowID.
 */
export function buildClientWorkflowID(
  projectId: string,
  operation: string,
  clientKey: string
): string {
  return `client:${projectId}:${operation}:${clientKey}`;
}

/**
 * Build unique workflow ID (no idempotency key provided).
 * Each call creates a new workflow.
 */
export function buildUniqueWorkflowID(entity: string, action: string): string {
  return `${entity}:${action}:${crypto.randomUUID()}`;
}

/**
 * Build workflow ID for event dispatch.
 */
export function buildEventWorkflowID(eventType: string, eventId: string): string {
  return `event:dispatch:${eventType}:${eventId}`;
}

/**
 * Normalize string for use in workflow IDs.
 * Ensures deterministic IDs across different input formats.
 */
export function normalizeForWorkflowID(value: string): string {
  return value.trim().toLowerCase().normalize("NFKC");
}
```

### Step 1.4: Package Index

**File: `packages/workflows/src/index.ts`**

```typescript
// Errors
export { ServiceError, isServiceError } from "./errors.js";

// Workflow ID helpers
export {
  buildClientWorkflowID,
  buildUniqueWorkflowID,
  buildEventWorkflowID,
  normalizeForWorkflowID,
} from "./workflowId.js";
```

---

## Phase 2: Workflow Patterns

### Step 2.1: Base Workflow Pattern

Every workflow should follow this pattern:

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import { ServiceError, normalizeForWorkflowID } from "@shopana/workflows";
import type { ServiceBroker } from "@shopana/shared-kernel";

export interface MyWorkflowInput {
  // Input fields
}

export interface MyWorkflowResult {
  // Result fields
}

export class MyWorkflow {
  constructor(private readonly broker: ServiceBroker) {}

  /**
   * 1. Static workflowID method - derives deterministic ID from input.
   */
  static workflowID(input: MyWorkflowInput): string {
    // Return deterministic ID based on business intent
    return `my-workflow:${input.someUniqueField}`;
  }

  /**
   * 2. Static start method - entry point with idempotent ID.
   */
  static async start(input: MyWorkflowInput): Promise<MyWorkflowResult> {
    const workflowID = MyWorkflow.workflowID(input);
    const handle = await DBOS.startWorkflow(MyWorkflow, { workflowID });
    return handle.run(input);
  }

  /**
   * 3. Main workflow method.
   */
  @DBOS.workflow()
  async run(input: MyWorkflowInput): Promise<MyWorkflowResult> {
    // Orchestrate steps
    const step1Result = await this.step1(input);
    await this.step2(step1Result);
    return { /* result */ };
  }

  /**
   * 4. Steps with retry configuration.
   */
  @DBOS.step({ maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 })
  private async step1(input: MyWorkflowInput): Promise<Step1Result> {
    const result = await this.broker.call("service.action", input);

    if (result.userErrors?.length) {
      throw ServiceError.validation("service", "action", result.userErrors[0].message);
    }

    return result;
  }

  @DBOS.step({ maxAttempts: 3 })
  private async step2(data: Step1Result): Promise<void> {
    // ...
  }
}
```

### Step 2.2: StoreCreateWorkflow Example

**File: `services/project/src/workflows/StoreCreateWorkflow.ts`**

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import { ServiceError, normalizeForWorkflowID } from "@shopana/workflows";
import type { ServiceBroker } from "@shopana/shared-kernel";

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
   * Deterministic workflow ID from business input.
   * Same org + same store name = same workflow ID = idempotent.
   */
  static workflowID(input: StoreCreateInput): string {
    const normalizedName = normalizeForWorkflowID(input.name);
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

    // Step 2: Create IAM roles
    await this.createRoles(store.id, input.organizationId, input.userId);

    // Step 3: Create media asset group (non-critical)
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
        error: result.userErrors[0].message,
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

## Phase 3: API Layer Integration

### Step 3.1: GraphQL Middleware

**File: `services/bootstrap/src/graphql/middleware/idempotency.ts`**

```typescript
import type { MiddlewareFn } from "type-graphql";
import type { Context } from "../context.js";

/**
 * Middleware to extract Idempotency-Key header.
 */
export const idempotencyMiddleware: MiddlewareFn<Context> = async ({ context }, next) => {
  const header = context.request.headers.get("idempotency-key");
  if (header) {
    context.idempotencyKey = header;
  }
  return next();
};
```

### Step 3.2: Resolver with Idempotency

**File: `services/project/src/resolvers/StoreMutations.ts`**

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import { Resolver, Mutation, Ctx, Arg } from "type-graphql";
import { buildClientWorkflowID, buildUniqueWorkflowID, ServiceError } from "@shopana/workflows";
import { StoreCreateWorkflow, type StoreCreateInput } from "../workflows/StoreCreateWorkflow.js";
import type { Context } from "../context.js";

@Resolver()
export class StoreMutations {
  @Mutation(() => StoreCreatePayload)
  async storeCreate(
    @Ctx() ctx: Context,
    @Arg("input") input: StoreCreateInput
  ): Promise<StoreCreatePayload> {
    // Build workflow ID from client key or generate unique
    const workflowID = ctx.idempotencyKey
      ? buildClientWorkflowID(ctx.auth.projectId, "storeCreate", ctx.idempotencyKey)
      : StoreCreateWorkflow.workflowID({
          ...input,
          organizationId: ctx.auth.organizationId,
          userId: ctx.auth.userId,
        });

    try {
      const handle = await DBOS.startWorkflow(StoreCreateWorkflow, { workflowID });
      const result = await handle.run({
        ...input,
        organizationId: ctx.auth.organizationId,
        userId: ctx.auth.userId,
      });

      return { store: result.store, userErrors: [] };
    } catch (error) {
      if (error instanceof ServiceError) {
        return {
          store: null,
          userErrors: [{ field: null, message: error.message, code: error.code }],
        };
      }
      throw error;
    }
  }
}
```

### Step 3.3: REST Endpoint Example

**File: `services/project/src/routes/stores.ts`**

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import { Router } from "express";
import { buildClientWorkflowID, buildUniqueWorkflowID, ServiceError } from "@shopana/workflows";
import { StoreCreateWorkflow } from "../workflows/StoreCreateWorkflow.js";

const router = Router();

router.post("/stores", async (req, res) => {
  const clientKey = req.headers["idempotency-key"] as string | undefined;
  const { projectId, organizationId, userId } = req.auth;

  const input = {
    ...req.body,
    organizationId,
    userId,
  };

  const workflowID = clientKey
    ? buildClientWorkflowID(projectId, "storeCreate", clientKey)
    : StoreCreateWorkflow.workflowID(input);

  try {
    const handle = await DBOS.startWorkflow(StoreCreateWorkflow, { workflowID });
    const result = await handle.run(input);

    res.status(201).json({ store: result.store });
  } catch (error) {
    if (error instanceof ServiceError) {
      const status = error.retryable ? 503 : 400;
      res.status(status).json({ error: error.message, code: error.code });
    } else {
      res.status(500).json({ error: "Internal error" });
    }
  }
});

export default router;
```

---

## Phase 4: Domain-Level Idempotency

Services should implement naturally idempotent operations:

### Step 4.1: UPSERT Pattern in Scripts

**File: `services/iam/src/scripts/CreateRolesScript.ts`**

```typescript
import { sql } from "drizzle-orm";
import type { Script, ScriptContext } from "@shopana/shared-kernel";

export interface CreateRolesParams {
  userId: string;
  organizationId: string;
  domain: string;
  roles: RoleDefinition[];
}

export interface CreateRolesResult {
  roles: Role[];
  userErrors: UserError[];
}

export class CreateRolesScript implements Script<CreateRolesParams, CreateRolesResult> {
  async execute(ctx: ScriptContext, params: CreateRolesParams): Promise<CreateRolesResult> {
    const createdRoles: Role[] = [];

    for (const roleDef of params.roles) {
      // Generate deterministic ID
      const roleId = this.generateRoleId(params.domain, roleDef.name);

      // UPSERT - idempotent by design
      const [role] = await ctx.db.execute(sql`
        INSERT INTO roles (id, domain, name, permissions, created_by)
        VALUES (
          ${roleId},
          ${params.domain},
          ${roleDef.name},
          ${JSON.stringify(roleDef.permissions)},
          ${params.userId}
        )
        ON CONFLICT (id) DO UPDATE SET
          permissions = EXCLUDED.permissions,
          updated_at = NOW()
        RETURNING *
      `);

      createdRoles.push(role);
    }

    return { roles: createdRoles, userErrors: [] };
  }

  private generateRoleId(domain: string, roleName: string): string {
    const crypto = await import("node:crypto");
    return crypto.createHash("sha256").update(`role:${domain}:${roleName}`).digest("hex");
  }
}
```

### Step 4.2: Unique Constraints

**File: `services/media/src/scripts/CreateAssetGroupScript.ts`**

```typescript
import { eq, and } from "drizzle-orm";
import type { Script, ScriptContext } from "@shopana/shared-kernel";
import { assetGroups } from "../db/schema.js";

export interface CreateAssetGroupParams {
  ownerType: string;
  ownerId: string;
}

export interface CreateAssetGroupResult {
  assetGroup: AssetGroup;
  userErrors: UserError[];
}

export class CreateAssetGroupScript implements Script<CreateAssetGroupParams, CreateAssetGroupResult> {
  async execute(ctx: ScriptContext, params: CreateAssetGroupParams): Promise<CreateAssetGroupResult> {
    // Check if already exists (idempotent)
    const existing = await ctx.db.query.assetGroups.findFirst({
      where: and(
        eq(assetGroups.ownerType, params.ownerType),
        eq(assetGroups.ownerId, params.ownerId)
      ),
    });

    if (existing) {
      return { assetGroup: existing, userErrors: [] };
    }

    // Create with unique constraint as safety net
    try {
      const [assetGroup] = await ctx.db
        .insert(assetGroups)
        .values({
          ownerType: params.ownerType,
          ownerId: params.ownerId,
        })
        .returning();

      return { assetGroup, userErrors: [] };
    } catch (error) {
      // Handle race condition - another request created it
      if (isUniqueViolation(error)) {
        const existing = await ctx.db.query.assetGroups.findFirst({
          where: and(
            eq(assetGroups.ownerType, params.ownerType),
            eq(assetGroups.ownerId, params.ownerId)
          ),
        });
        return { assetGroup: existing!, userErrors: [] };
      }
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && error.message.includes("unique constraint");
}
```

---

## Phase 5: Event-Driven Architecture

### Step 5.1: Event Types

**File: `packages/events/src/types.ts`**

```typescript
export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  eventId: string;
  eventType: TType;
  timestamp: string;
  source: string;
  payload: TPayload;
  context: EventContext;
}

export interface EventContext {
  projectId: string;
  userId?: string;
  correlationId: string;
  causationId?: string;
}

// Concrete event types
export interface StoreCreatedEvent extends DomainEvent<"store.created", {
  storeId: string;
  organizationId: string;
  name: string;
}> {}

export interface ProductCreatedEvent extends DomainEvent<"product.created", {
  productId: string;
  storeId: string;
  name: string;
}> {}

export type ShopanaEvent = StoreCreatedEvent | ProductCreatedEvent;
```

### Step 5.2: Event Dispatch Workflow

**File: `packages/events/src/workflows/EventDispatchWorkflow.ts`**

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import { buildEventWorkflowID, ServiceError } from "@shopana/workflows";
import type { DomainEvent } from "../types.js";
import type { ServiceBroker } from "@shopana/shared-kernel";

export interface EventDispatchResult {
  eventId: string;
  eventType: string;
  handlersInvoked: number;
  handlersSucceeded: number;
  handlersFailed: number;
}

export class EventDispatchWorkflow {
  constructor(private readonly broker: ServiceBroker) {}

  static workflowID(event: DomainEvent): string {
    return buildEventWorkflowID(event.eventType, event.eventId);
  }

  static async start(event: DomainEvent): Promise<EventDispatchResult> {
    const workflowID = EventDispatchWorkflow.workflowID(event);
    const handle = await DBOS.startWorkflow(EventDispatchWorkflow, { workflowID });
    return handle.dispatch(event);
  }

  @DBOS.workflow()
  async dispatch(event: DomainEvent): Promise<EventDispatchResult> {
    // Step 1: Discover handlers
    const handlers = await this.discoverHandlers(event.eventType);

    if (handlers.length === 0) {
      return {
        eventId: event.eventId,
        eventType: event.eventType,
        handlersInvoked: 0,
        handlersSucceeded: 0,
        handlersFailed: 0,
      };
    }

    // Step 2: Invoke handlers
    let succeeded = 0;
    let failed = 0;

    for (const handler of handlers) {
      try {
        await this.invokeHandler(event, handler);
        succeeded++;
      } catch (error) {
        console.error("Handler failed", {
          eventId: event.eventId,
          handler: `${handler.service}.${handler.action}`,
          error,
        });
        failed++;

        // Stop on critical handler failure
        if (handler.critical) {
          break;
        }
      }
    }

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      handlersInvoked: handlers.length,
      handlersSucceeded: succeeded,
      handlersFailed: failed,
    };
  }

  @DBOS.step()
  private async discoverHandlers(eventType: string): Promise<HandlerInfo[]> {
    const response = await this.broker.call("bootstrap.getEventHandlers", { eventType });
    return response.handlers ?? [];
  }

  @DBOS.step({ maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 })
  private async invokeHandler(event: DomainEvent, handler: HandlerInfo): Promise<void> {
    const result = await this.broker.call(`${handler.service}.${handler.action}`, { event });

    if (result.userErrors?.length) {
      throw ServiceError.validation(
        handler.service,
        handler.action,
        result.userErrors[0].message
      );
    }
  }
}

interface HandlerInfo {
  service: string;
  action: string;
  critical: boolean;
}
```

### Step 5.3: Event Emitter

**File: `packages/events/src/emitter.ts`**

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { DomainEvent } from "./types.js";
import { EventDispatchWorkflow, type EventDispatchResult } from "./workflows/EventDispatchWorkflow.js";

export class EventEmitter {
  /**
   * Emit an event (fire-and-forget).
   * Returns workflow ID for tracking.
   */
  @DBOS.step()
  async emit<TEvent extends DomainEvent>(event: TEvent): Promise<{ workflowId: string }> {
    const workflowId = EventDispatchWorkflow.workflowID(event);

    // Start workflow in background
    DBOS.startWorkflow(EventDispatchWorkflow, { workflowID: workflowId })
      .dispatch(event)
      .catch((err) => console.error("EventDispatch failed", { workflowId, err }));

    return { workflowId };
  }

  /**
   * Emit and wait for all handlers to complete.
   */
  @DBOS.step()
  async emitAndWait<TEvent extends DomainEvent>(event: TEvent): Promise<EventDispatchResult> {
    return EventDispatchWorkflow.start(event);
  }
}
```

---

## Summary: File Checklist

### New Package: @shopana/workflows

| File | Purpose |
|------|---------|
| `packages/workflows/package.json` | Package config |
| `packages/workflows/src/errors.ts` | ServiceError class |
| `packages/workflows/src/workflowId.ts` | Workflow ID helpers |
| `packages/workflows/src/index.ts` | Exports |

### New Package: @shopana/events

| File | Purpose |
|------|---------|
| `packages/events/src/types.ts` | Event types |
| `packages/events/src/emitter.ts` | Event emitter |
| `packages/events/src/workflows/EventDispatchWorkflow.ts` | Dispatch workflow |
| `packages/events/src/index.ts` | Exports |

### Modified Files

| File | Changes |
|------|---------|
| `services/project/src/workflows/StoreCreateWorkflow.ts` | Use DBOS idempotency pattern |
| `services/*/src/scripts/*.ts` | Add UPSERT/idempotent patterns |
| `services/*/src/resolvers/*.ts` | Use workflow ID from client key |

### NOT Needed (Removed)

| Component | Why Not Needed |
|-----------|----------------|
| `processed_requests` table | DBOS tracks workflow state |
| `IdempotencyRepository` | Not needed |
| `withIdempotency()` helper | DBOS step recording |
| `broker.fire()` method | Use `broker.call()` in steps |
| `@Fire` decorator | Not needed |
| Cleanup jobs | DBOS manages own state |
| Lease mechanism | DBOS handles internally |

---

## Testing Checklist

### Workflow Idempotency

- [ ] Same workflowID returns same result without re-execution
- [ ] Different workflowID creates new workflow
- [ ] Client idempotency key maps to correct workflowID
- [ ] Workflow restart resumes from last completed step

### Domain Idempotency

- [ ] UPSERT operations handle duplicates correctly
- [ ] Unique constraints prevent duplicate creation
- [ ] Deterministic IDs produce same ID for same input

### Event Dispatch

- [ ] Event workflow ID derived from eventId
- [ ] Handlers invoked with retry on failure
- [ ] Critical handler failure stops subsequent handlers

### E2E

- [ ] Full store creation flow with idempotency
- [ ] Client retry with same Idempotency-Key header
- [ ] Event emission and handler invocation
