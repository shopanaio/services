# DBOS Workflow Service Ports Architecture

**Status**: Proposed (v2)
**Author**: Generated from existing codebase patterns
**Date**: 2025-01-18
**Last Updated**: 2025-01-18

## Overview

This document describes how to evolve our DBOS workflows to use **Service Ports** - an abstraction layer that enables:

- **Today**: In-process calls via `ServiceBroker` (current pattern)
- **Tomorrow**: gRPC calls to separate microservices (zero workflow changes)

The key insight: workflows should not know *how* they communicate with services, only *what* they need to call.

## Current Architecture

### Existing Patterns

**1. ServiceBroker** (`packages/shared-kernel/src/broker/ServiceBroker.ts`)

```typescript
// Current: Direct broker calls in workflows
await this.broker.call("iam.createRoles", { ... });
await this.broker.call("media.createAssetGroup", { ... });
```

**2. BrokerActions** (`services/*/src/*BrokerActions.ts`)

Each service exposes actions via `@Action` decorator:

```typescript
// services/iam/src/IamBrokerActions.ts
@Action("createRoles")
async createRoles(params: CreateRolesParams): Promise<CreateRolesResult> {
  return this.kernel.runScript(CreateRolesScript, params);
}
```

**3. StoreCreateWorkflow** (`services/project/src/workflows/StoreCreateWorkflow.ts`)

Current implementation directly uses `this.broker.call()`:

```typescript
@DBOS.step()
async createRoles(storeId: string, organizationId: string, userId: string) {
  const result = await this.broker.call("iam.createRoles", { ... });
  if (!result.success) throw new Error(result.error);
}
```

### Problems with Current Approach

1. **Tight coupling**: Workflows know about broker internals
2. **Hard to test**: Need full broker setup for unit tests
3. **Migration pain**: Switching to gRPC requires rewriting workflows
4. **No idempotency context**: No standard way to pass operation ID for deduplication
5. **Inconsistent error handling**: Some actions return `{success, error}`, others throw

---

## Proposed Architecture

### Core Abstractions

#### 1. ActionContext (Idempotency & Tracing)

```typescript
// packages/workflows/src/ports/types.ts

export interface ActionContext {
  /** DBOS workflow ID - globally unique */
  operationId: string;

  /**
   * Unique key for idempotency.
   * Format: operationId:service:action:callId
   *
   * callId ensures multiple calls to same action within one workflow
   * are distinguishable (e.g., assigning roles to different users).
   */
  idempotencyKey: string;

  /** ISO timestamp when action was initiated */
  timestamp: string;
}
```

#### 2. ActionRequest / ActionResponse (Explicit Envelope)

```typescript
// packages/workflows/src/ports/types.ts

/**
 * Standard request envelope for all service calls.
 * Keeps payload clean and ctx standardized.
 * Maps directly to gRPC proto structure.
 */
export interface ActionRequest<T = unknown> {
  payload: T;
  ctx: ActionContext;
}

/**
 * Standard response envelope.
 * Port implementations unwrap this and throw on error.
 */
export interface ActionResponse<T = unknown> {
  result: T;
  error?: {
    code: string;
    message: string;
  };
}
```

#### 3. ServicePort Interface

```typescript
// packages/workflows/src/ports/types.ts

export interface ServicePort {
  /** Service name (e.g., "iam", "media", "inventory") */
  readonly name: string;

  /**
   * Execute an action on this service.
   *
   * IMPORTANT: Always throws on failure (never returns error objects).
   * This keeps workflow code linear without if-checks.
   *
   * @throws ServiceError on any failure
   */
  handle<TResult = unknown>(
    action: string,
    payload: unknown,
    ctx: ActionContext
  ): Promise<TResult>;
}

export class ServiceError extends Error {
  constructor(
    public readonly service: string,
    public readonly action: string,
    public readonly code: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(`[${service}.${action}] ${message}`);
    this.name = "ServiceError";
  }
}
```

### Port Implementations

#### LocalServicePort (Current: In-Process)

Wraps existing `ServiceBroker.call()` with explicit envelope:

```typescript
// packages/workflows/src/ports/LocalServicePort.ts

import { ServiceBroker } from "@shopana/shared-kernel";
import type { ServicePort, ActionContext, ActionRequest } from "./types.js";
import { ServiceError } from "./types.js";

export class LocalServicePort implements ServicePort {
  constructor(
    public readonly name: string,
    private readonly broker: ServiceBroker
  ) {}

  async handle<TResult = unknown>(
    action: string,
    payload: unknown,
    ctx: ActionContext
  ): Promise<TResult> {
    const qualifiedAction = `${this.name}.${action}`;

    // Send as explicit envelope (not mixed into payload)
    const request: ActionRequest = { payload, ctx };

    try {
      const response = await this.broker.call<{ result?: TResult; success?: boolean; error?: string }>(
        qualifiedAction,
        request
      );

      // Handle legacy {success, error} responses - convert to throw
      if (response && typeof response === "object" && "success" in response) {
        if (!response.success) {
          throw new ServiceError(
            this.name,
            action,
            "ACTION_FAILED",
            response.error || "Action failed without error message"
          );
        }
        // Return result if present, otherwise the whole response
        return (response.result ?? response) as TResult;
      }

      return response as TResult;
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      throw new ServiceError(
        this.name,
        action,
        "CALL_FAILED",
        error instanceof Error ? error.message : String(error),
        error
      );
    }
  }
}
```

#### GrpcServicePort (Future: Remote Calls)

```typescript
// packages/workflows/src/ports/GrpcServicePort.ts

import type { ServicePort, ActionContext, ActionRequest, ActionResponse } from "./types.js";
import { ServiceError } from "./types.js";

export interface GrpcClient {
  handle(request: ActionRequest): Promise<ActionResponse>;
}

export interface GrpcServicePortOptions {
  timeoutMs?: number;
}

export class GrpcServicePort implements ServicePort {
  constructor(
    public readonly name: string,
    private readonly client: GrpcClient,
    private readonly options: GrpcServicePortOptions = {}
  ) {}

  async handle<TResult = unknown>(
    action: string,
    payload: unknown,
    ctx: ActionContext
  ): Promise<TResult> {
    const request: ActionRequest = { payload, ctx };

    try {
      const response = await this.client.handle(request);

      if (response.error) {
        throw new ServiceError(
          this.name,
          action,
          response.error.code,
          response.error.message
        );
      }

      return response.result as TResult;
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      throw new ServiceError(
        this.name,
        action,
        "GRPC_ERROR",
        error instanceof Error ? error.message : String(error),
        error
      );
    }
  }
}
```

---

## Refactored Workflow

### BaseWorkflow with Ports (Focused)

BaseWorkflow handles **only** port-related concerns. Domain services (kernel, repository) stay in concrete workflows.

```typescript
// packages/workflows/src/BaseWorkflow.ts

import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { ServicePort, ActionContext } from "./ports/types.js";

export interface WorkflowPortServices {
  ports: Map<string, ServicePort>;
}

/**
 * Base class for workflows that call external services via ports.
 *
 * Responsibilities:
 * - Port lookup and management
 * - ActionContext building with proper idempotency keys
 * - Standardized service calls
 *
 * Does NOT include domain-specific services (kernel, repository).
 * Those belong in concrete workflow classes.
 */
export abstract class BaseWorkflow extends ConfiguredInstance {
  protected readonly ports: Map<string, ServicePort>;

  constructor(name: string, services: WorkflowPortServices) {
    super(name);
    this.ports = services.ports;
  }

  /**
   * Get port for a service.
   * @throws Error if port not registered
   */
  protected getPort(serviceName: string): ServicePort {
    const port = this.ports.get(serviceName);
    if (!port) {
      const available = [...this.ports.keys()].join(", ");
      throw new Error(`Port not found: ${serviceName}. Available: ${available}`);
    }
    return port;
  }

  /**
   * Build ActionContext for current workflow step.
   *
   * @param service - Target service name
   * @param action - Action being called
   * @param callId - Unique identifier for this specific call.
   *                 REQUIRED when calling same action multiple times in one workflow.
   *                 Use deterministic values (e.g., storeId, `${userId}:admin`) for
   *                 reproducibility during workflow recovery.
   */
  protected buildContext(service: string, action: string, callId?: string): ActionContext {
    const operationId = DBOS.workflowID!;
    const effectiveCallId = callId ?? "default";

    return {
      operationId,
      idempotencyKey: `${operationId}:${service}:${action}:${effectiveCallId}`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Call a service action through its port.
   *
   * @param serviceName - Target service (e.g., "iam", "media")
   * @param action - Action name (e.g., "createRoles")
   * @param payload - Action payload (type-safe via generic)
   * @param callId - Optional call identifier for idempotency (required if calling
   *                 same action multiple times within workflow)
   *
   * @throws ServiceError on any failure (never returns error objects)
   */
  protected async callService<TResult = unknown>(
    serviceName: string,
    action: string,
    payload: unknown,
    callId?: string
  ): Promise<TResult> {
    const port = this.getPort(serviceName);
    const ctx = this.buildContext(serviceName, action, callId);
    return port.handle<TResult>(action, payload, ctx);
  }
}
```

### Refactored StoreCreateWorkflow

**Key changes:**
1. Each external service call is a **separate `@DBOS.step()`** for proper retry isolation
2. Uses `callId` for idempotency when calling same action type multiple times
3. No if-checks for errors - `callService` throws on failure
4. Domain services (kernel, repository) injected via constructor, not in BaseWorkflow

```typescript
// services/project/src/workflows/StoreCreateWorkflow.ts

import { DBOS } from "@shopana/workflows";
import { v7 as uuidv7 } from "uuid";
import { BaseWorkflow, type WorkflowPortServices } from "@shopana/workflows";
import { Roles, RolesMeta } from "@shopana/rbac";
import type { Kernel } from "../kernel/Kernel.js";
import type { StoreCreateInput, StoreCreateOutput } from "./types.js";

function buildStoreRoles() {
  return (Object.keys(Roles.store) as Array<keyof typeof Roles.store>).map((roleName) => {
    const permissions = Roles.store[roleName];
    const meta = RolesMeta.store[roleName];
    return {
      name: roleName,
      displayName: meta.displayName,
      description: meta.description,
      permissions: permissions.map((p) => ({
        resource: p.resource,
        action: p.action,
      })),
    };
  });
}

export interface StoreCreateWorkflowServices extends WorkflowPortServices {
  kernel: Kernel;
}

export class StoreCreateWorkflow extends BaseWorkflow {
  private readonly kernel: Kernel;

  constructor(name: string, services: StoreCreateWorkflowServices) {
    super(name, services);
    this.kernel = services.kernel;
  }

  protected get repository() {
    return this.kernel.getServices().repository;
  }

  static workflowID(name: string): string {
    return `store:create:${name}`;
  }

  @DBOS.workflow()
  async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
    const { organizationId, userId } = input;

    // Step 1: Generate store ID (deterministic on recovery)
    const storeId = await this.generateStoreId();

    // Step 2: Create store in local database
    await this.createStore(storeId, input, organizationId);

    // Step 3: Create roles for this store domain
    await this.createStoreRoles(storeId, organizationId, userId);

    // Step 4: Assign admin role to creator
    await this.assignAdminRole(storeId, organizationId, userId);

    // Step 5: Create media asset group
    await this.createMediaAssetGroup(storeId);

    return { storeId, organizationId };
  }

  @DBOS.step()
  private async generateStoreId(): Promise<string> {
    return uuidv7();
  }

  @DBOS.step()
  private async createStore(storeId: string, input: StoreCreateInput, organizationId: string) {
    return this.repository.store.create({
      id: storeId,
      organizationId,
      name: input.name,
      displayName: input.displayName,
      locales: input.locales,
      currencies: input.currencies,
      defaultCurrency: input.defaultCurrency,
      status: input.status,
      timezone: input.timezone,
      email: input.email,
    });
  }

  /**
   * Step: Create roles for store domain.
   * Uses storeId as callId since this is store-scoped.
   */
  @DBOS.step()
  private async createStoreRoles(storeId: string, organizationId: string, userId: string) {
    // callId = storeId ensures idempotency for this store's role creation
    await this.callService(
      "iam",
      "createRoles",
      {
        userId,
        organizationId,
        domain: `store:${storeId}`,
        roles: buildStoreRoles(),
      },
      storeId // callId for idempotency
    );
  }

  /**
   * Step: Assign admin role to store creator.
   * Uses composite callId since we might assign roles to multiple users.
   */
  @DBOS.step()
  private async assignAdminRole(storeId: string, organizationId: string, userId: string) {
    // callId includes userId in case we assign multiple roles to different users
    await this.callService(
      "iam",
      "assignRole",
      {
        userId,
        organizationId,
        domain: `store:${storeId}`,
        roleName: "admin",
      },
      `${storeId}:admin:${userId}` // callId for idempotency
    );
  }

  /**
   * Step: Create media asset group for this store.
   */
  @DBOS.step()
  private async createMediaAssetGroup(storeId: string) {
    await this.callService(
      "media",
      "createAssetGroup",
      {
        ownerType: "store",
        ownerId: storeId,
      },
      storeId // callId for idempotency
    );
  }
}
```

---

## Wiring: NestJS Module

### Port Factory with Proper DI

```typescript
// packages/workflows/src/ports/PortFactory.ts

import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ServiceBroker } from "@shopana/shared-kernel";
import { LocalServicePort } from "./LocalServicePort.js";
import { GrpcServicePort, type GrpcClient } from "./GrpcServicePort.js";
import type { ServicePort } from "./types.js";

export const PORT_FACTORY_CONFIG = Symbol("PORT_FACTORY_CONFIG");

export type TransportMode = "local" | "grpc";

export interface PortFactoryConfig {
  mode: TransportMode;
  grpcClients?: Map<string, GrpcClient>;
}

@Injectable()
export class PortFactory {
  private readonly mode: TransportMode;
  private readonly grpcClients: Map<string, GrpcClient>;

  constructor(
    private readonly broker: ServiceBroker,
    private readonly configService: ConfigService,
    @Inject(PORT_FACTORY_CONFIG)
    config?: PortFactoryConfig
  ) {
    // Priority: injected config > env > default
    this.mode = config?.mode
      ?? (this.configService.get<string>("TRANSPORT_MODE") as TransportMode)
      ?? "local";
    this.grpcClients = config?.grpcClients ?? new Map();
  }

  create(serviceName: string): ServicePort {
    if (this.mode === "grpc" && this.grpcClients.has(serviceName)) {
      const client = this.grpcClients.get(serviceName)!;
      return new GrpcServicePort(serviceName, client);
    }

    return new LocalServicePort(serviceName, this.broker);
  }

  createMany(serviceNames: string[]): Map<string, ServicePort> {
    const ports = new Map<string, ServicePort>();
    for (const name of serviceNames) {
      ports.set(name, this.create(name));
    }
    return ports;
  }
}
```

### Module Provider Setup

```typescript
// packages/workflows/src/workflows.module.ts

import { Module, type DynamicModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PortFactory, PORT_FACTORY_CONFIG, type PortFactoryConfig } from "./ports/PortFactory.js";

@Module({})
export class WorkflowsModule {
  static forRoot(config?: PortFactoryConfig): DynamicModule {
    return {
      module: WorkflowsModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: PORT_FACTORY_CONFIG,
          useValue: config ?? { mode: "local" },
        },
        PortFactory,
      ],
      exports: [PortFactory],
    };
  }
}
```

### Workflow Registration in Project Module

```typescript
// services/project/src/project.module.ts (partial)

import { Module, type OnModuleInit } from "@nestjs/common";
import { WorkflowRegistry } from "@shopana/workflows";
import { PortFactory } from "@shopana/workflows/ports";
import { StoreCreateWorkflow } from "./workflows/StoreCreateWorkflow.js";
import { Kernel } from "./kernel/Kernel.js";

@Module({})
export class ProjectModule implements OnModuleInit {
  constructor(
    private readonly workflowRegistry: WorkflowRegistry,
    private readonly portFactory: PortFactory,
  ) {}

  async onModuleInit() {
    const kernel = Kernel.getInstance();

    // Create ports for services this workflow depends on
    const ports = this.portFactory.createMany(["iam", "media", "inventory", "orders"]);

    // Register workflow with ports + domain services
    this.workflowRegistry.register(
      "storeCreate",
      new StoreCreateWorkflow("storeCreate", {
        kernel,
        ports,
      })
    );
  }
}
```

---

## Service-Side: Handling ActionRequest

Services need to accept the new `ActionRequest` envelope format.

### Updated BrokerActions Pattern

```typescript
// Example: services/iam/src/IamBrokerActions.ts

import { Injectable } from "@nestjs/common";
import { BrokerActions, Action, ZodSchema } from "@shopana/shared-kernel";
import type { ActionRequest, ActionContext } from "@shopana/workflows/ports";

// Define input schema that accepts envelope OR legacy format
const createRolesRequestSchema = z.union([
  // New envelope format
  z.object({
    payload: createRolesPayloadSchema,
    ctx: actionContextSchema,
  }),
  // Legacy format (for backwards compatibility)
  createRolesPayloadSchema,
]);

@Injectable()
export class IamBrokerActions extends BrokerActions {

  @Action("createRoles")
  @ZodSchema(createRolesRequestSchema)
  async createRoles(
    input: ActionRequest<CreateRolesPayload> | CreateRolesPayload
  ): Promise<CreateRolesResult> {
    // Unwrap envelope if present
    const { payload, ctx } = this.unwrapRequest(input);

    // Idempotency check (optional but recommended)
    if (ctx?.idempotencyKey) {
      const existing = await this.checkIdempotency(ctx.idempotencyKey);
      if (existing) return existing;
    }

    // Execute the action
    const result = await this.kernel.runScript(CreateRolesScript, payload);

    // Store for idempotency
    if (ctx?.idempotencyKey) {
      await this.storeIdempotency(ctx.idempotencyKey, result);
    }

    return result;
  }

  /**
   * Unwrap ActionRequest envelope or pass through legacy payload.
   */
  private unwrapRequest<T>(input: ActionRequest<T> | T): { payload: T; ctx?: ActionContext } {
    if (input && typeof input === "object" && "payload" in input && "ctx" in input) {
      return input as ActionRequest<T>;
    }
    return { payload: input as T };
  }

  private async checkIdempotency(key: string): Promise<CreateRolesResult | null> {
    const cached = await this.kernel.repository.processedRequest.find(key);
    if (cached) {
      return JSON.parse(cached.result);
    }
    return null;
  }

  private async storeIdempotency(key: string, result: CreateRolesResult): Promise<void> {
    await this.kernel.repository.processedRequest.upsert({
      idempotencyKey: key,
      result: JSON.stringify(result),
      createdAt: new Date(),
    });
  }
}
```

---

## Idempotency Support

### Database Table

```sql
-- In each service's migrations
CREATE TABLE IF NOT EXISTS processed_requests (
  idempotency_key TEXT PRIMARY KEY,
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  result JSONB,  -- Cache the result for replay
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_processed_requests_created_at ON processed_requests(created_at);

-- Cleanup old entries (e.g., keep 7 days)
-- Run periodically: DELETE FROM processed_requests WHERE created_at < NOW() - INTERVAL '7 days';
```

### Idempotency Key Format

```
{operationId}:{service}:{action}:{callId}

Examples:
- store:create:my-store:iam:createRoles:store-123
- store:create:my-store:iam:assignRole:store-123:admin:user-456
- store:create:my-store:media:createAssetGroup:store-123
```

**callId selection guidelines:**

| Scenario | callId |
|----------|--------|
| One call per workflow | `"default"` or omit |
| Store-scoped operation | `storeId` |
| User-scoped operation | `${storeId}:${userId}` |
| Multiple items | `${storeId}:${itemId}` |

---

## Error Handling

### Design Decision: Ports Always Throw

All `ServicePort.handle()` implementations **throw on error**, never return error objects.

**Rationale:**
- Workflow code stays linear (no if-checks)
- DBOS step retry naturally handles transient failures
- Consistent error handling across all services
- Stack traces preserved for debugging

### ServiceError Structure

```typescript
export class ServiceError extends Error {
  constructor(
    public readonly service: string,    // e.g., "iam"
    public readonly action: string,     // e.g., "createRoles"
    public readonly code: string,       // e.g., "ROLE_EXISTS"
    message: string,
    public readonly cause?: unknown
  ) {
    super(`[${service}.${action}] ${message}`);
    this.name = "ServiceError";
  }

  toJSON() {
    return {
      name: this.name,
      service: this.service,
      action: this.action,
      code: this.code,
      message: this.message,
    };
  }
}
```

### Compensation Pattern

For workflows needing rollback on partial failure:

```typescript
@DBOS.workflow()
async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
  const storeId = await this.generateStoreId();

  try {
    await this.createStore(storeId, input);
    await this.createStoreRoles(storeId, input.organizationId, input.userId);
    await this.assignAdminRole(storeId, input.organizationId, input.userId);
    await this.createMediaAssetGroup(storeId);
  } catch (error) {
    // Compensate on failure
    await this.compensate(storeId);
    throw error;
  }

  return { storeId, organizationId: input.organizationId };
}

@DBOS.step()
private async compensate(storeId: string): Promise<void> {
  // Best-effort cleanup - don't throw on compensation failures
  const cleanupCalls = [
    this.callService("media", "deleteAssetGroup", { ownerType: "store", ownerId: storeId }, storeId),
    this.callService("iam", "deleteRoles", { domain: `store:${storeId}` }, storeId),
  ];

  await Promise.allSettled(cleanupCalls);
  await this.repository.store.delete(storeId);
}
```

---

## Migration Path

### Phase 1: Introduce Ports (No Behavior Change)

1. Create `packages/workflows/src/ports/` with interfaces and types
2. Implement `LocalServicePort` wrapping existing `ServiceBroker`
3. Add `PortFactory` to DI with proper NestJS patterns
4. Create `BaseWorkflow` with port support
5. Update `StoreCreateWorkflow` to extend BaseWorkflow and use `callService()`
6. Split multi-call steps into individual `@DBOS.step()` methods

**Result**: Same behavior, cleaner abstraction, better retry isolation.

### Phase 2: Add ActionRequest Envelope

1. Update `BrokerActions` to accept `ActionRequest` envelope
2. Add backwards-compatible unwrapping for legacy callers
3. Pass `ActionContext` through ports

**Result**: Services receive context for idempotency.

### Phase 3: Add Idempotency

1. Create `processed_requests` table in each service
2. Implement idempotency checks in BrokerActions
3. Add cleanup job for old entries

**Result**: Safe retries without duplicate effects.

### Phase 4: Extract Services (When Ready)

1. Define gRPC proto matching `ActionRequest`/`ActionResponse`
2. Implement gRPC server in target service (calls same `handleAction` logic)
3. Implement `GrpcServicePort`
4. Switch `TRANSPORT_MODE=grpc` for extracted services

```typescript
// Environment-based configuration
// .env
TRANSPORT_MODE=grpc
IAM_GRPC_HOST=iam-service:50051
MEDIA_GRPC_HOST=media-service:50051
```

**Result**: Workflow code unchanged, transport switched.

---

## Action Naming Convention

| Level | Format | Example |
|-------|--------|---------|
| Broker action | `service.action` | `iam.createRoles` |
| Port call | `action` only (port adds service) | `createRoles` |
| Lifecycle actions | `entity.verb` | `store.initialize`, `store.cleanup` |

In port calls, the service is implicit:
```typescript
// Port knows it's "iam", so we just say "createRoles"
await this.callService("iam", "createRoles", payload);
// Internally becomes: broker.call("iam.createRoles", { payload, ctx })
```

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Service calls | `this.broker.call("iam.action", params)` | `this.callService("iam", "action", params, callId)` |
| Payload format | Mixed into params | Explicit `{ payload, ctx }` envelope |
| Idempotency | None | `operationId:service:action:callId` |
| Error handling | Return `{success, error}` | Always throw `ServiceError` |
| Step granularity | Multiple calls in one step | One external call per step |
| Transport | Hardcoded in-process | Pluggable via `ServicePort` |
| Testing | Need full broker | Mock `ServicePort` interface |
| gRPC migration | Rewrite workflows | Change env config |

### Files to Create

```
packages/workflows/src/ports/
├── index.ts
├── types.ts              # ActionContext, ActionRequest, ActionResponse, ServicePort, ServiceError
├── LocalServicePort.ts
├── GrpcServicePort.ts
└── PortFactory.ts

packages/workflows/src/
├── BaseWorkflow.ts       # Port-focused base class
└── workflows.module.ts   # NestJS module with proper DI
```

### Files to Modify

```
services/project/src/workflows/
├── StoreCreateWorkflow.ts  # Use callService(), separate steps
└── types.ts                # Remove kernel from base services

services/*/src/*BrokerActions.ts  # Accept ActionRequest envelope
```

---

## Appendix: Existing Service Actions Reference

### IAM Service (`services/iam/src/IamBrokerActions.ts`)

| Action | Parameters | Result |
|--------|------------|--------|
| `getCurrentUser` | `{ accessToken }` | `{ user, userErrors }` |
| `authorize` | `{ subject, organizationId, domain, resource, action }` | `{ allowed }` |
| `batchAuthorize` | `{ requests[] }` | `{ results[] }` |
| `createRoles` | `{ userId, organizationId, domain, roles[] }` | `{ success, error? }` |
| `assignRole` | `{ userId, organizationId, domain, roleName }` | `{ success, error? }` |

### Media Service (`services/media/src/MediaBrokerActions.ts`)

| Action | Parameters | Result |
|--------|------------|--------|
| `createAssetGroup` | `{ ownerType, ownerId }` | `{ assetGroup }` |
| `deleteAssetGroup` | `{ ownerType, ownerId }` | `{ success }` |
| `getAssetGroup` | `{ ownerType, ownerId }` | `{ assetGroup }` |

### Inventory Service (`services/inventory/src/InventoryBrokerActions.ts`)

| Action | Parameters | Result |
|--------|------------|--------|
| `getOffers` | `{ productIds, variantIds }` | `{ offers[] }` |

### Actions to Add (for Store Lifecycle)

Each service should implement:

| Action | Description |
|--------|-------------|
| `store.initialize` | Create default data for new store |
| `store.cleanup` | Remove all store data (compensation) |
| `store.suspend` | Soft-disable store access |
| `store.resume` | Re-enable store access |
