# DBOS Workflow Service Ports Architecture

**Status**: Proposed
**Author**: Generated from existing codebase patterns
**Date**: 2025-01-18

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

---

## Proposed Architecture

### Core Abstractions

#### 1. ActionContext (Idempotency & Tracing)

```typescript
// packages/workflows/src/ports/ActionContext.ts

export interface ActionContext {
  /** DBOS workflow ID - globally unique */
  operationId: string;
  /** Unique key for idempotency: operationId:service:action */
  idempotencyKey: string;
  /** ISO timestamp when action was initiated */
  timestamp: string;
}
```

#### 2. ServicePort Interface

```typescript
// packages/workflows/src/ports/ServicePort.ts

export interface ServicePort {
  /** Service name (e.g., "iam", "media", "inventory") */
  readonly name: string;

  /**
   * Execute an action on this service.
   * Returns the result or throws on failure.
   */
  handle<TResult = unknown>(
    action: string,
    payload: unknown,
    ctx: ActionContext
  ): Promise<TResult>;
}
```

### Port Implementations

#### LocalServicePort (Current: In-Process)

Wraps existing `ServiceBroker.call()`:

```typescript
// packages/workflows/src/ports/LocalServicePort.ts

import { ServiceBroker } from "@shopana/shared-kernel";
import type { ServicePort, ActionContext } from "./types.js";

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
    // Fully qualified action name
    const qualifiedAction = `${this.name}.${action}`;

    // Pass context in payload (services can use for idempotency)
    const enrichedPayload = {
      ...payload as object,
      __ctx: ctx, // Optional: services can ignore if not needed
    };

    return this.broker.call<TResult>(qualifiedAction, enrichedPayload);
  }
}
```

#### GrpcServicePort (Future: Remote Calls)

```typescript
// packages/workflows/src/ports/GrpcServicePort.ts

import type { ServicePort, ActionContext } from "./types.js";

export interface GrpcClient {
  handle(request: { action: string; payload: unknown; ctx: ActionContext }): Promise<unknown>;
}

export class GrpcServicePort implements ServicePort {
  constructor(
    public readonly name: string,
    private readonly client: GrpcClient,
    private readonly options: { timeoutMs?: number } = {}
  ) {}

  async handle<TResult = unknown>(
    action: string,
    payload: unknown,
    ctx: ActionContext
  ): Promise<TResult> {
    // gRPC call with deadline
    const result = await this.client.handle({
      action,
      payload,
      ctx,
    });

    return result as TResult;
  }
}
```

---

## Refactored Workflow

### BaseWorkflow with Ports

```typescript
// services/project/src/workflows/BaseWorkflow.ts

import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import { DBOS } from "@shopana/workflows";
import type { ServicePort, ActionContext } from "@shopana/workflows/ports";
import type { Kernel } from "../kernel/Kernel.js";

export interface WorkflowServices {
  kernel: Kernel;
  ports: Map<string, ServicePort>;
}

export abstract class BaseWorkflow extends ConfiguredInstance {
  protected readonly kernel: Kernel;
  protected readonly ports: Map<string, ServicePort>;

  constructor(name: string, services: WorkflowServices) {
    super(name);
    this.kernel = services.kernel;
    this.ports = services.ports;
  }

  /**
   * Get port for a service.
   * Throws if port not registered.
   */
  protected getPort(serviceName: string): ServicePort {
    const port = this.ports.get(serviceName);
    if (!port) {
      throw new Error(`Port not found: ${serviceName}. Available: ${[...this.ports.keys()].join(", ")}`);
    }
    return port;
  }

  /**
   * Build ActionContext for current workflow step.
   */
  protected buildContext(service: string, action: string): ActionContext {
    const operationId = DBOS.workflowID!;
    return {
      operationId,
      idempotencyKey: `${operationId}:${service}:${action}`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Call a service action through its port.
   * Automatically builds context with idempotency key.
   */
  protected async callService<TResult = unknown>(
    serviceName: string,
    action: string,
    payload: unknown
  ): Promise<TResult> {
    const port = this.getPort(serviceName);
    const ctx = this.buildContext(serviceName, action);
    return port.handle<TResult>(action, payload, ctx);
  }
}
```

### Refactored StoreCreateWorkflow

```typescript
// services/project/src/workflows/StoreCreateWorkflow.ts

import { DBOS } from "@shopana/workflows";
import { v7 as uuidv7 } from "uuid";
import { BaseWorkflow } from "./BaseWorkflow.js";
import { Roles, RolesMeta } from "@shopana/rbac";
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

export class StoreCreateWorkflow extends BaseWorkflow {
  static workflowID(name: string): string {
    return `store:create:${name}`;
  }

  @DBOS.workflow()
  async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
    const { organizationId, userId } = input;

    // Step 1: Generate store ID
    const storeId = await this.generateStoreId();

    // Step 2: Create store in local database
    await this.createStore(storeId, input, organizationId);

    // Step 3: Initialize dependent services
    await this.initializeServices(storeId, organizationId, userId);

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
   * Initialize all dependent services.
   * Each call uses ServicePort for transport abstraction.
   */
  @DBOS.step()
  private async initializeServices(storeId: string, organizationId: string, userId: string) {
    // IAM: Create roles
    const rolesResult = await this.callService<{ success: boolean; error?: string }>(
      "iam",
      "createRoles",
      {
        userId,
        organizationId,
        domain: `store:${storeId}`,
        roles: buildStoreRoles(),
      }
    );
    if (!rolesResult.success) {
      throw new Error(rolesResult.error || "Failed to create store roles");
    }

    // IAM: Assign admin role to creator
    const assignResult = await this.callService<{ success: boolean; error?: string }>(
      "iam",
      "assignRole",
      {
        userId,
        organizationId,
        domain: `store:${storeId}`,
        roleName: "admin",
      }
    );
    if (!assignResult.success) {
      throw new Error(assignResult.error || "Failed to assign admin role");
    }

    // Media: Create asset group
    await this.callService("media", "createAssetGroup", {
      ownerType: "store",
      ownerId: storeId,
    });

    // Future: Inventory, Orders, etc. - just add more callService() calls
    // await this.callService("inventory", "initializeStore", { storeId });
    // await this.callService("orders", "initializeStore", { storeId });
  }
}
```

---

## Wiring: NestJS Module

### Port Factory

```typescript
// packages/workflows/src/ports/PortFactory.ts

import { Injectable } from "@nestjs/common";
import { ServiceBroker } from "@shopana/shared-kernel";
import { LocalServicePort } from "./LocalServicePort.js";
import { GrpcServicePort } from "./GrpcServicePort.js";
import type { ServicePort } from "./types.js";

export type TransportMode = "local" | "grpc";

export interface PortFactoryConfig {
  mode: TransportMode;
  grpcClients?: Map<string, unknown>; // Future: gRPC client instances
}

@Injectable()
export class PortFactory {
  constructor(
    private readonly broker: ServiceBroker,
    private readonly config: PortFactoryConfig = { mode: "local" }
  ) {}

  create(serviceName: string): ServicePort {
    if (this.config.mode === "grpc" && this.config.grpcClients?.has(serviceName)) {
      const client = this.config.grpcClients.get(serviceName)!;
      return new GrpcServicePort(serviceName, client as any);
    }

    // Default: local in-process calls
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

### Workflow Module Registration

```typescript
// services/project/src/project.module.ts (partial)

@Module({})
export class ProjectModule implements OnModuleInit {
  constructor(
    private readonly broker: ServiceBroker,
    private readonly workflowRegistry: WorkflowRegistry,
    private readonly portFactory: PortFactory,
  ) {}

  async onModuleInit() {
    const kernel = Kernel.getInstance();

    // Create ports for services this workflow depends on
    const ports = this.portFactory.createMany(["iam", "media", "inventory", "orders"]);

    // Register workflow with ports
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

## Idempotency Support (Optional but Recommended)

When migrating to gRPC, network retries can cause duplicate calls. Add idempotency checking:

### Database Table

```sql
-- In each service's migrations
CREATE TABLE IF NOT EXISTS processed_requests (
  idempotency_key TEXT PRIMARY KEY,
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup
CREATE INDEX idx_processed_requests_created_at ON processed_requests(created_at);
```

### Idempotency Guard in BrokerActions

```typescript
// Example: services/iam/src/IamBrokerActions.ts

@Action("createRoles")
async createRoles(params: CreateRolesParams & { __ctx?: ActionContext }): Promise<CreateRolesResult> {
  const ctx = params.__ctx;

  // Skip if already processed (idempotency)
  if (ctx?.idempotencyKey) {
    const existing = await this.kernel.repository.processedRequest.find(ctx.idempotencyKey);
    if (existing) {
      // Return cached result or success indicator
      return { success: true, cached: true };
    }
  }

  // Execute the action
  const result = await this.kernel.runScript(CreateRolesScript, params);

  // Mark as processed
  if (ctx?.idempotencyKey) {
    await this.kernel.repository.processedRequest.create({
      idempotencyKey: ctx.idempotencyKey,
      service: "iam",
      action: "createRoles",
      operationId: ctx.operationId,
    });
  }

  return result;
}
```

---

## Migration Path

### Phase 1: Introduce Ports (No Behavior Change)

1. Create `packages/workflows/src/ports/` with interfaces
2. Implement `LocalServicePort` wrapping existing `ServiceBroker`
3. Add `PortFactory` to DI
4. Refactor `BaseWorkflow` to accept ports
5. Update `StoreCreateWorkflow` to use `callService()`

**Result**: Same behavior, cleaner abstraction.

### Phase 2: Add Idempotency Context

1. Add `ActionContext` passing through ports
2. Services can optionally use `__ctx.idempotencyKey`
3. No breaking changes - context is advisory

### Phase 3: Extract Services (When Ready)

1. Create gRPC proto definitions
2. Implement gRPC server in target service
3. Implement `GrpcServicePort`
4. Swap port in `PortFactory` config

```typescript
// Environment-based configuration
const config: PortFactoryConfig = {
  mode: process.env.USE_GRPC === "true" ? "grpc" : "local",
  grpcClients: new Map([
    ["iam", iamGrpcClient],
    ["media", mediaGrpcClient],
  ]),
};
```

**Result**: Workflow code unchanged, transport switched.

---

## Error Handling & Compensation

### Parallel Fan-out with Compensation

For operations that need rollback on partial failure:

```typescript
@DBOS.step()
private async fanoutWithCompensation(
  storeId: string,
  organizationId: string,
  userId: string
): Promise<void> {
  const services = ["iam", "media", "inventory"];

  const results = await Promise.allSettled(
    services.map(svc =>
      this.callService(svc, "store.initialize", { storeId, organizationId, userId })
    )
  );

  const failures = results
    .map((r, i) => ({ result: r, service: services[i] }))
    .filter(x => x.result.status === "rejected");

  if (failures.length > 0) {
    // Compensate successful services
    const successful = services.filter((_, i) => results[i].status === "fulfilled");
    await this.compensate(storeId, successful);

    throw new Error(`Failed services: ${failures.map(f => f.service).join(", ")}`);
  }
}

@DBOS.step()
private async compensate(storeId: string, services: string[]): Promise<void> {
  await Promise.allSettled(
    services.map(svc =>
      this.callService(svc, "store.cleanup", { storeId })
    )
  );
}
```

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Service calls | `this.broker.call("iam.action", params)` | `this.callService("iam", "action", params)` |
| Transport | Hardcoded in-process | Pluggable via `ServicePort` |
| Idempotency | None | Built-in context with `idempotencyKey` |
| Testing | Need full broker | Mock `ServicePort` interface |
| gRPC migration | Rewrite workflows | Change port factory config |

### Files to Create

```
packages/workflows/src/ports/
├── index.ts
├── types.ts           # ActionContext, ServicePort interface
├── LocalServicePort.ts
├── GrpcServicePort.ts
└── PortFactory.ts
```

### Files to Modify

```
services/project/src/workflows/
├── BaseWorkflow.ts    # Add ports support
├── StoreCreateWorkflow.ts  # Use callService()
└── types.ts           # Add port-related types

services/project/src/project.module.ts  # Wire up PortFactory
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
