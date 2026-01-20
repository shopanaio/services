# Broker Workflow Implementation Plan

**Created**: 2026-01-20
**Based on**: idempotency-key-strategies.md, event-driven-architecture-implementation-plan.md
**Status**: Planning

---

## Обзор

Добавление метода `broker.runWorkflow()` для запуска зарегистрированных workflows аналогично тому, как регистрируются и вызываются actions через `broker.call()`.

### Ключевые требования

1. **Удаление `@shopana/workflows`** — весь код переносится в `@shopana/shared-kernel`
2. **BrokerWorkflows** — новый базовый класс по аналогии с `BrokerActions`
3. **Декларативная регистрация** — workflows регистрируются автоматически через декораторы
4. **DBOS под капотом** — декораторы `@Workflow`, `@Step` скрывают DBOS в shared-kernel
5. **Обязательный idempotency key** — на входе требуется ключ идемпотентности

---

## Архитектура

### Текущее состояние

```
┌─────────────────────────────────────────────────────────────────┐
│                         Service Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  BrokerActions                    │  Workflows (manual)          │
│  ├─ @Action decorator             │  ├─ extends ConfiguredInstance│
│  ├─ auto-registration             │  ├─ @DBOS.workflow()         │
│  └─ broker.register()             │  ├─ @DBOS.step()             │
│                                   │  └─ manual registration       │
├─────────────────────────────────────────────────────────────────┤
│                        ServiceBroker                             │
│  ├─ register(action, handler)                                    │
│  ├─ call(action, params)                                         │
│  └─ emit(event, payload)                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Целевое состояние

```
┌─────────────────────────────────────────────────────────────────┐
│                         Service Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  BrokerActions                    │  BrokerWorkflows (NEW)       │
│  ├─ @Action decorator             │  ├─ @Workflow decorator      │
│  ├─ auto-registration             │  ├─ @Step decorator          │
│  └─ broker.register()             │  └─ auto-registration        │
├─────────────────────────────────────────────────────────────────┤
│  WorkflowRegistry                                                │
│  ├─ register(name, descriptor)                                   │
│  ├─ start(name, params, idempotencyCtx)                          │
│  └─ run(name, params, idempotencyCtx)                            │
├─────────────────────────────────────────────────────────────────┤
│                        ServiceBroker                             │
│  ├─ register(action, handler)                                    │
│  ├─ call(action, params)                                         │
│  ├─ runWorkflow(name, params, idempotencyCtx)  [NEW]             │
│  └─ emit(event, payload)                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Tracker

### Phase 0: Migrate `@shopana/workflows` → `@shopana/shared-kernel`

| #   | Task                                          | Status     | Notes                                    |
| --- | --------------------------------------------- | ---------- | ---------------------------------------- |
| 0.1 | Add `@dbos-inc/dbos-sdk` to shared-kernel     | ⬜ Pending | `pnpm add @dbos-inc/dbos-sdk`            |
| 0.2 | Add `canonicalize` to shared-kernel           | ⬜ Pending | `pnpm add canonicalize`                  |
| 0.3 | Create `shared-kernel/src/workflow/` folder   | ⬜ Pending | New folder for workflow code             |
| 0.4 | Move `WorkflowModule.ts`                      | ⬜ Pending | → `shared-kernel/src/workflow/`          |
| 0.5 | Move `WorkflowRegistry.ts`                    | ⬜ Pending | → `shared-kernel/src/workflow/`          |
| 0.6 | Move `types.ts`                               | ⬜ Pending | → `shared-kernel/src/workflow/types.ts`  |
| 0.7 | Update `shared-kernel/src/index.ts` exports   | ⬜ Pending | Add DBOS, WorkflowRegistry, etc.         |
| 0.8 | Delete `packages/workflows/` package          | ⬜ Pending | Remove entire folder                     |
| 0.9 | Update imports in all services (37 files)     | ⬜ Pending | `@shopana/workflows` → `@shopana/shared-kernel` |
| 0.10| Update `package.json` in services             | ⬜ Pending | Remove `@shopana/workflows` dependency   |
| 0.11| Create `WORKFLOW_REGISTRY` symbol             | ⬜ Pending | In `shared-kernel/src/workflow/tokens.ts`|
| 0.12| Preserve `WorkflowModule.forRoot()` API       | ⬜ Pending | Keep DBOS lifecycle management           |

### Phase 1: Decorators (`@shopana/shared-kernel`)

| #   | Task                                 | Status     | Notes                             |
| --- | ------------------------------------ | ---------- | --------------------------------- |
| 1.1 | Create `@Workflow` decorator         | ⬜ Pending | Wraps DBOS.workflow() with metadata |
| 1.2 | Create `@Step` decorator             | ⬜ Pending | Wraps DBOS.step() with metadata   |
| 1.3 | Create `WorkflowMetadata` interface  | ⬜ Pending | name, idempotencyStrategy         |
| 1.4 | Create `StepMetadata` interface      | ⬜ Pending | name, retriesAllowed, etc.        |
| 1.5 | Export decorators from shared-kernel | ⬜ Pending | Update index.ts                   |

### Phase 2: Idempotency Types (`@shopana/shared-kernel`)

| #   | Task                                   | Status     | Notes                           |
| --- | -------------------------------------- | ---------- | ------------------------------- |
| 2.1 | Create `IdempotencyContext` union type | ⬜ Pending | Client, Workflow, Content       |
| 2.2 | Create `ClientIdempotencyContext`      | ⬜ Pending | External API calls              |
| 2.3 | Create `WorkflowIdempotencyContext`    | ⬜ Pending | Internal workflow calls         |
| 2.4 | Create `ContentIdempotencyContext`     | ⬜ Pending | Content-hash based              |
| 2.5 | Create `buildIdempotencyKey()` utility | ⬜ Pending | Build final key from context    |
| 2.6 | Create `hashContent()` utility         | ⬜ Pending | SHA256 of canonicalized JSON    |

### Phase 3: Workflow Registry Updates (`@shopana/shared-kernel`)

| #   | Task                                 | Status     | Notes                             |
| --- | ------------------------------------ | ---------- | --------------------------------- |
| 3.1 | Create `WorkflowDescriptor` interface| ⬜ Pending | instance, methodName, metadata    |
| 3.2 | Rewrite `WorkflowRegistry.register()`| ⬜ Pending | Accept WorkflowDescriptor         |
| 3.3 | Add `WorkflowRegistry.getDescriptor()` | ⬜ Pending | Get descriptor by name          |
| 3.4 | Add `WorkflowRegistry.start()`       | ⬜ Pending | Start with idempotency context    |
| 3.5 | Add `WorkflowRegistry.run()`         | ⬜ Pending | Start and await result            |

### Phase 4: BrokerWorkflows Base Class (`@shopana/shared-kernel`)

| #   | Task                                | Status     | Notes                            |
| --- | ----------------------------------- | ---------- | -------------------------------- |
| 4.1 | Create `BrokerWorkflows` base class | ⬜ Pending | Extends ConfiguredInstance       |
| 4.2 | Implement `onModuleInit()`          | ⬜ Pending | Auto-register workflows          |
| 4.3 | Implement `onModuleDestroy()`       | ⬜ Pending | Deregister workflows             |
| 4.4 | Add workflow scanning logic         | ⬜ Pending | Find @Workflow decorated methods |
| 4.5 | Export from shared-kernel           | ⬜ Pending | Update index.ts                  |

### Phase 5: ServiceBroker Updates (`@shopana/shared-kernel`)

| #   | Task                            | Status     | Notes                           |
| --- | ------------------------------- | ---------- | ------------------------------- |
| 5.1 | Add `WorkflowRegistry` to constructor | ⬜ Pending | Inject via DI                 |
| 5.2 | Add `runWorkflow()` method      | ⬜ Pending | Run workflow with idempotency   |
| 5.3 | Add `hasWorkflow()` method      | ⬜ Pending | Check if workflow exists        |
| 5.4 | Make `qualifyAction()` public   | ⬜ Pending | Currently private, needed by BrokerWorkflows |

### Phase 6: Migration (All Services)

| #   | Task                                     | Status     | Notes                    |
| --- | ---------------------------------------- | ---------- | ------------------------ |
| 6.1 | Migrate Project service workflows        | ⬜ Pending | StoreCreateWorkflow      |
| 6.2 | Migrate IAM service workflows            | ⬜ Pending | OrganizationCreate/Delete |
| 6.3 | Migrate Inventory service workflows      | ⬜ Pending | ProductCreate, BackRef, etc. |
| 6.4 | Migrate Media service workflows          | ⬜ Pending | FileHardDelete, GC, etc. |
| 6.5 | Update all resolvers                     | ⬜ Pending | Use broker.runWorkflow() |
| 6.6 | Delete old workflow classes              | ⬜ Pending | Clean up after migration |

---

## Detailed Implementation

### Phase 0: Migration `@shopana/workflows` → `@shopana/shared-kernel`

#### Files to Move

```
packages/workflows/src/WorkflowModule.ts    → packages/shared-kernel/src/workflow/WorkflowModule.ts
packages/workflows/src/WorkflowRegistry.ts  → packages/shared-kernel/src/workflow/WorkflowRegistry.ts
packages/workflows/src/types.ts             → packages/shared-kernel/src/workflow/types.ts
packages/workflows/src/index.ts             → (merge into shared-kernel/src/index.ts)
```

#### Import Updates (37 files)

```bash
# All occurrences of:
import { ... } from "@shopana/workflows";

# Change to:
import { ... } from "@shopana/shared-kernel";
```

**Affected services**: project, iam, inventory, media, bootstrap

#### 0.11-0.12 DBOS Lifecycle Management

The current `WorkflowModule` manages DBOS lifecycle (launch/shutdown). This MUST be preserved.

**File**: `packages/shared-kernel/src/workflow/tokens.ts`

```typescript
/**
 * Symbol for dependency injection of WorkflowRegistry.
 */
export const WORKFLOW_REGISTRY = Symbol("WORKFLOW_REGISTRY");

/**
 * Symbol for dependency injection of WorkflowModule config.
 */
export const WORKFLOW_CONFIG = Symbol("WORKFLOW_CONFIG");
```

**File**: `packages/shared-kernel/src/workflow/WorkflowModule.ts`

```typescript
import {
  DynamicModule,
  Global,
  Logger,
  Module,
  OnModuleDestroy,
  OnModuleInit,
  Inject,
} from "@nestjs/common";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { WorkflowRegistry } from "./WorkflowRegistry.js";
import { WORKFLOW_CONFIG, WORKFLOW_REGISTRY } from "./tokens.js";

export interface WorkflowModuleConfig {
  /** PostgreSQL connection URL for DBOS */
  databaseUrl: string;
  /** Application name for DBOS */
  name: string;
  /** Optional: Database schema for DBOS system tables (default: 'dbos') */
  schema?: string;
}

/**
 * Global NestJS module that:
 * 1. Configures DBOS with database connection
 * 2. Manages DBOS lifecycle (launch/shutdown)
 * 3. Provides WorkflowRegistry for DI
 *
 * @example
 * @Module({
 *   imports: [
 *     WorkflowModule.forRoot({
 *       databaseUrl: process.env.DBOS_DATABASE_URL!,
 *       name: 'shopana',
 *     }),
 *   ],
 * })
 * export class AppModule {}
 */
@Global()
@Module({})
export class WorkflowModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowModule.name);

  constructor(
    @Inject(WORKFLOW_CONFIG)
    private readonly config: WorkflowModuleConfig
  ) {}

  static forRoot(config: WorkflowModuleConfig): DynamicModule {
    return {
      module: WorkflowModule,
      providers: [
        {
          provide: WORKFLOW_CONFIG,
          useValue: config,
        },
        {
          provide: WORKFLOW_REGISTRY,
          useClass: WorkflowRegistry,
        },
      ],
      exports: [WORKFLOW_REGISTRY],
    };
  }

  async onModuleInit(): Promise<void> {
    this.logger.log("Configuring DBOS...");

    DBOS.setConfig({
      databaseUrl: this.config.databaseUrl,
      applicationName: this.config.name,
      systemSchema: this.config.schema ?? "dbos",
    });

    await DBOS.launch();
    this.logger.log("DBOS launched");
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log("Shutting down DBOS...");
    await DBOS.shutdown();
    this.logger.log("DBOS shutdown complete");
  }
}
```

**Usage in services** (unchanged from current implementation):

```typescript
// services/project/src/project.nest-module.ts
import { Module } from "@nestjs/common";
import { WorkflowModule } from "@shopana/shared-kernel";

@Module({
  imports: [
    WorkflowModule.forRoot({
      databaseUrl: process.env.DBOS_DATABASE_URL!,
      name: "shopana",
    }),
    // ... other imports
  ],
})
export class ProjectModule {}
```

---

### Phase 1: Decorators

#### 1.1-1.2 @Workflow and @Step Decorators

**File**: `packages/shared-kernel/src/decorators/Workflow.ts`

```typescript
import "reflect-metadata";
import { DBOS } from "@dbos-inc/dbos-sdk";

export const WORKFLOW_METADATA_KEY = Symbol("broker:workflow");

export interface WorkflowMetadata {
  /** Workflow name for registration */
  name: string;
  /** Idempotency strategy hint */
  idempotencyStrategy?: "client" | "workflow" | "content";
}

/**
 * Decorator that marks a method as a durable workflow.
 * Wraps DBOS.workflow() and adds registration metadata.
 *
 * @param name - Workflow name (will be prefixed with service name)
 * @param options - Optional configuration
 *
 * @example
 * class StoreWorkflows extends BrokerWorkflows {
 *   @Workflow("storeCreate")
 *   async createStore(input: StoreCreateInput): Promise<StoreCreateOutput> {
 *     // workflow implementation
 *   }
 * }
 *
 * // Usage:
 * await broker.runWorkflow("project.storeCreate", input, {
 *   source: "client",
 *   clientKey: "user-store-123",
 *   tenantId: ctx.organizationId,
 *   apiKeyId: ctx.apiKeyId,
 * });
 */
export function Workflow(
  name: string,
  options?: Partial<Omit<WorkflowMetadata, "name">>,
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    // Store workflow metadata for registration
    const metadata: WorkflowMetadata = {
      name,
      idempotencyStrategy: options?.idempotencyStrategy,
    };
    Reflect.defineMetadata(
      WORKFLOW_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );

    // Apply DBOS.workflow() decorator
    return DBOS.workflow()(target, propertyKey, descriptor);
  };
}
```

**File**: `packages/shared-kernel/src/decorators/Step.ts`

```typescript
import "reflect-metadata";
import { DBOS, StepConfig } from "@dbos-inc/dbos-sdk";

export const STEP_METADATA_KEY = Symbol("broker:step");

export interface StepMetadata {
  /** Step name for logging/debugging */
  name?: string;
  /** Whether retries are allowed */
  retriesAllowed?: boolean;
  /** Maximum retry attempts */
  maxAttempts?: number;
  /** Initial retry interval in seconds */
  intervalSeconds?: number;
  /** Backoff multiplier */
  backoffRate?: number;
}

/**
 * Decorator that marks a method as a workflow step.
 * Wraps DBOS.step() with additional metadata.
 *
 * @param options - Step configuration
 *
 * @example
 * @Step({ name: "createStore", retriesAllowed: true, maxAttempts: 3 })
 * async createStore(input: StoreCreateInput): Promise<Store> {
 *   return this.repository.store.create(input);
 * }
 */
export function Step(options?: StepMetadata): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    // Store step metadata
    if (options) {
      Reflect.defineMetadata(STEP_METADATA_KEY, options, target, propertyKey);
    }

    // Build DBOS step config
    const stepConfig: StepConfig = {};
    if (options?.retriesAllowed !== undefined) {
      stepConfig.retriesAllowed = options.retriesAllowed;
    }
    if (options?.maxAttempts !== undefined) {
      stepConfig.maxAttempts = options.maxAttempts;
    }
    if (options?.intervalSeconds !== undefined) {
      stepConfig.intervalSeconds = options.intervalSeconds;
    }
    if (options?.backoffRate !== undefined) {
      stepConfig.backoffRate = options.backoffRate;
    }

    // Apply DBOS.step() decorator
    return DBOS.step(stepConfig)(target, propertyKey, descriptor);
  };
}
```

---

### Phase 2: Idempotency Types

**File**: `packages/shared-kernel/src/workflow/idempotency.ts`

```typescript
import { createHash } from "node:crypto";
import canonicalize from "canonicalize";

/**
 * Client-provided idempotency key (External API).
 * Used for requests from external clients via HTTP Idempotency-Key header.
 */
export interface ClientIdempotencyContext {
  source: "client";
  /** Client-provided idempotency key from HTTP header */
  clientKey: string;
  /** Tenant/organization ID */
  tenantId: string;
  /** API key ID used for the request */
  apiKeyId: string;
}

/**
 * Workflow-derived idempotency key (Service-Initiated).
 * Used for background jobs, event handlers, cron tasks.
 */
export interface WorkflowIdempotencyContext {
  source: "workflow";
  /** Business ID of parent workflow */
  workflowId: string;
  /** Step name within workflow */
  stepId: string;
  /** Unique ID for fan-out operations */
  callId?: string;
}

/**
 * Content-derived idempotency key (Idempotent Updates).
 * Used for UPDATE/SET operations where same data = same operation.
 */
export interface ContentIdempotencyContext {
  source: "content";
  /** Resource identifier (e.g., SKU, productId) */
  resourceId: string;
  /** Operation name */
  operation: string;
  /** SHA256 hash of canonicalized payload */
  contentHash: string;
}

/**
 * Union type for all idempotency contexts
 */
export type IdempotencyContext =
  | ClientIdempotencyContext
  | WorkflowIdempotencyContext
  | ContentIdempotencyContext;

/**
 * Build deterministic idempotency key from context.
 */
export function buildIdempotencyKey(
  workflowName: string,
  ctx: IdempotencyContext,
): string {
  const hash = (input: string): string => {
    return createHash("sha256").update(input).digest("hex").slice(0, 32);
  };

  switch (ctx.source) {
    case "client": {
      const input = `v1:client:${ctx.tenantId}:${ctx.apiKeyId}:${workflowName}:${ctx.clientKey}`;
      return `client:${hash(input)}`;
    }

    case "workflow": {
      const callId = ctx.callId ?? "";
      const input = `v1:workflow:${ctx.workflowId}:${ctx.stepId}:${callId}:${workflowName}`;
      return `workflow:${hash(input)}`;
    }

    case "content": {
      const input = `v1:content:${ctx.resourceId}:${ctx.operation}:${ctx.contentHash}:${workflowName}`;
      return `content:${hash(input)}`;
    }
  }
}

/**
 * Helper to create content hash for ContentIdempotencyContext.
 */
export function hashContent(payload: unknown): string {
  const canonical = canonicalize(payload);
  if (!canonical) {
    throw new Error("Failed to canonicalize payload");
  }
  return createHash("sha256").update(canonical).digest("hex");
}
```

---

### Phase 3: Workflow Registry Updates

**File**: `packages/shared-kernel/src/workflow/WorkflowRegistry.ts`

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { WorkflowHandle } from "./types.js";
import { buildIdempotencyKey, type IdempotencyContext } from "./idempotency.js";

/**
 * Descriptor for a registered workflow.
 * Contains the workflow instance and metadata for execution.
 */
export interface WorkflowDescriptor {
  /** Workflow instance (extends ConfiguredInstance) */
  instance: unknown;
  /** Workflow metadata from @Workflow decorator */
  metadata: {
    name: string;
    idempotencyStrategy?: "client" | "workflow" | "content";
  };
}

/**
 * Symbol for dependency injection of WorkflowRegistry.
 * Used by WorkflowModule.forRoot() and ServiceBroker.
 */
export const WORKFLOW_REGISTRY = Symbol("WORKFLOW_REGISTRY");

@Injectable()
export class WorkflowRegistry {
  private readonly logger = new Logger(WorkflowRegistry.name);
  private readonly workflows = new Map<string, WorkflowDescriptor>();

  /**
   * Register workflow with metadata.
   * Called automatically by BrokerWorkflows during onModuleInit.
   */
  register(qualifiedName: string, descriptor: WorkflowDescriptor): void {
    if (this.workflows.has(qualifiedName)) {
      throw new Error(`Workflow "${qualifiedName}" already registered`);
    }
    this.workflows.set(qualifiedName, descriptor);
    this.logger.debug(`Registered workflow: ${qualifiedName}`);
  }

  /**
   * Deregister workflow (for graceful shutdown).
   */
  deregister(qualifiedName: string): void {
    this.workflows.delete(qualifiedName);
  }

  /**
   * Get workflow descriptor by qualified name.
   * Throws if workflow not found.
   */
  getDescriptor(qualifiedName: string): WorkflowDescriptor {
    const descriptor = this.workflows.get(qualifiedName);
    if (!descriptor) {
      throw new Error(
        `Workflow "${qualifiedName}" not found. Available: ${this.list().join(", ")}`,
      );
    }
    return descriptor;
  }

  /**
   * Get workflow instance by name (legacy API, for backward compatibility).
   * @deprecated Use getDescriptor() for new code.
   */
  get<T>(name: string): T {
    const descriptor = this.workflows.get(name);
    if (!descriptor) {
      throw new Error(
        `Workflow "${name}" not found. Available: ${this.list().join(", ")}`,
      );
    }
    return descriptor.instance as T;
  }

  /**
   * Check if workflow is registered.
   */
  has(qualifiedName: string): boolean {
    return this.workflows.has(qualifiedName);
  }

  /**
   * Get list of registered workflow names.
   */
  list(): string[] {
    return Array.from(this.workflows.keys());
  }

  /**
   * Start workflow with idempotency context.
   * Returns a handle to track workflow status and get result.
   *
   * IMPORTANT: All workflows use a standard `run(params)` entry point method.
   * The @Workflow decorator wraps the method with DBOS.workflow() which
   * expects this convention.
   */
  async start<TParams, TResult>(
    qualifiedName: string,
    params: TParams,
    idempotencyCtx: IdempotencyContext,
  ): Promise<WorkflowHandle<TResult>> {
    const descriptor = this.getDescriptor(qualifiedName);
    const { instance } = descriptor;

    // Build deterministic workflow ID from idempotency context
    const workflowID = buildIdempotencyKey(qualifiedName, idempotencyCtx);

    // Start workflow using DBOS with the standard `run` method convention.
    // This matches the current pattern: DBOS.startWorkflow(workflow).run(params)
    // Cast instance to have a run method that returns a DBOS handle.
    const workflowInstance = instance as {
      run: (params: TParams) => Promise<TResult>;
    };

    const handle = await DBOS.startWorkflow(workflowInstance, { workflowID }).run(params);

    return {
      workflowId: workflowID,
      getResult: () => handle.getResult(),
      getStatus: () => handle.getStatus(),
    };
  }

  /**
   * Execute workflow and wait for result.
   * Convenience method that starts workflow and awaits completion.
   */
  async run<TParams, TResult>(
    qualifiedName: string,
    params: TParams,
    idempotencyCtx: IdempotencyContext,
  ): Promise<TResult> {
    const handle = await this.start<TParams, TResult>(
      qualifiedName,
      params,
      idempotencyCtx,
    );
    return handle.getResult();
  }

  /**
   * Get handle to existing workflow by ID.
   * Used to check status or get result of previously started workflow.
   */
  retrieve<TResult>(workflowId: string): WorkflowHandle<TResult> {
    const handle = DBOS.retrieveWorkflow<TResult>(workflowId);
    return {
      workflowId,
      getResult: () => handle.getResult(),
      getStatus: () => handle.getStatus(),
    };
  }
}
```

---

### Phase 4: BrokerWorkflows Base Class

> **Key Difference from BrokerActions:**
> - `BrokerActions` does NOT extend `ConfiguredInstance` — it's a plain NestJS class
> - `BrokerWorkflows` MUST extend `ConfiguredInstance` for DBOS decorator support
> - Both implement `OnModuleInit` for auto-registration
> - `BrokerWorkflows` also implements `OnModuleDestroy` for cleanup

**File**: `packages/shared-kernel/src/broker/BrokerWorkflows.ts`

```typescript
import { Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import { WorkflowRegistry } from "../workflow/WorkflowRegistry.js";
import { ServiceBroker } from "./ServiceBroker.js";
import {
  WORKFLOW_METADATA_KEY,
  type WorkflowMetadata,
} from "../decorators/Workflow.js";
import "reflect-metadata";

/**
 * Services required by BrokerWorkflows.
 * Matches the pattern used in current BaseWorkflow implementations.
 *
 * Each service defines its own Kernel that provides these services,
 * so BrokerWorkflows accepts a generic interface rather than concrete Kernel type.
 */
export interface WorkflowServices {
  /** Service broker for inter-service calls */
  broker: ServiceBroker;
  /** Workflow registry for registration */
  workflow: WorkflowRegistry;
  /** Optional repository access */
  repository?: unknown;
  /** Optional logger */
  logger?: Logger;
}

/**
 * Base class for services that register broker workflows.
 * Extends ConfiguredInstance for DBOS decorator support (@Workflow, @Step).
 *
 * Unlike BrokerActions (which is a plain NestJS class), BrokerWorkflows
 * MUST extend ConfiguredInstance because DBOS decorators require it.
 *
 * @example
 * // In service-specific Kernel (e.g., services/project/src/kernel/Kernel.ts):
 * export class Kernel extends BaseKernel<ProjectKernelServices> {
 *   public workflow!: WorkflowRegistry;
 *   public repository!: Repository;
 *   // ... Kernel provides services that satisfy WorkflowServices interface
 * }
 *
 * // In BrokerWorkflows implementation:
 * @Injectable()
 * class ProjectBrokerWorkflows extends BrokerWorkflows {
 *   constructor(kernel: Kernel) {
 *     super("projectWorkflows", {
 *       broker: kernel.getServices().broker,
 *       workflow: kernel.workflow,
 *       repository: kernel.repository,
 *     });
 *   }
 *
 *   // Entry point MUST be named `run` for DBOS convention
 *   @Workflow("storeCreate")
 *   async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
 *     const storeId = await this.generateStoreId();
 *     await this.createStoreRecord(storeId, input);
 *     return { storeId, organizationId: input.organizationId };
 *   }
 *
 *   @Step()
 *   private async generateStoreId(): Promise<string> {
 *     return uuidv7();
 *   }
 *
 *   @Step({ retriesAllowed: true, maxAttempts: 3 })
 *   private async createStoreRecord(storeId: string, input: StoreCreateInput): Promise<void> {
 *     // Cast repository to service-specific type for type safety
 *     const repo = this.services.repository as Repository;
 *     await repo.store.create({ id: storeId, ...input });
 *   }
 * }
 */
export abstract class BrokerWorkflows
  extends ConfiguredInstance
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger: Logger;
  protected readonly services: WorkflowServices;
  private readonly registeredWorkflows: string[] = [];

  constructor(name: string, services: WorkflowServices) {
    super(name);
    this.services = services;
    this.logger = services.logger ?? new Logger(this.constructor.name);
  }

  /** Access to service broker */
  protected get broker(): ServiceBroker {
    return this.services.broker;
  }

  /** Access to workflow registry */
  protected get workflowRegistry(): WorkflowRegistry {
    return this.services.workflow;
  }

  /** Access to repositories (type depends on service) */
  protected get repository(): unknown {
    return this.services.repository;
  }

  /**
   * Called by NestJS when the module initializes.
   * Scans for @Workflow decorated methods and registers them.
   */
  onModuleInit(): void {
    this.registerWorkflows();
  }

  /**
   * Called by NestJS when the module is destroyed.
   * Deregisters all workflows for graceful shutdown.
   *
   * NOTE: BrokerActions does NOT implement OnModuleDestroy.
   * Workflows need explicit cleanup because DBOS tracks them.
   */
  onModuleDestroy(): void {
    for (const workflowName of this.registeredWorkflows) {
      this.workflowRegistry.deregister(workflowName);
    }
    this.registeredWorkflows.length = 0;
  }

  /**
   * Scans the class instance for methods decorated with @Workflow and registers them.
   */
  private registerWorkflows(): void {
    const prototype = Object.getPrototypeOf(this);
    const methodNames = this.getMethodNames(prototype);

    for (const methodName of methodNames) {
      const metadata = Reflect.getMetadata(
        WORKFLOW_METADATA_KEY,
        prototype,
        methodName,
      ) as WorkflowMetadata | undefined;

      if (metadata) {
        // Build qualified name (e.g., "project.storeCreate")
        const qualifiedName = this.broker.qualifyAction(metadata.name);

        // Register with workflow registry
        this.workflowRegistry.register(qualifiedName, {
          instance: this,
          metadata,
        });

        this.registeredWorkflows.push(qualifiedName);
      }
    }

    if (this.registeredWorkflows.length > 0) {
      this.logger.debug(
        `Registered workflows: ${this.registeredWorkflows.join(", ")}`,
      );
    }
  }

  /**
   * Gets all method names from a prototype, excluding constructor.
   */
  private getMethodNames(prototype: object): string[] {
    const methods: string[] = [];
    let currentProto = prototype;

    while (currentProto && currentProto !== Object.prototype) {
      const names = Object.getOwnPropertyNames(currentProto).filter((name) => {
        if (name === "constructor") return false;
        const descriptor = Object.getOwnPropertyDescriptor(currentProto, name);
        return descriptor && typeof descriptor.value === "function";
      });

      methods.push(...names);
      currentProto = Object.getPrototypeOf(currentProto);
    }

    return [...new Set(methods)];
  }
}
```

---

### Phase 5: ServiceBroker Updates

> **Note on WorkflowRegistry Injection:**
> WorkflowRegistry is injected as `@Optional()` to avoid circular dependency issues.
> If workflows are not used in a service, the registry will be null.

**File**: `packages/shared-kernel/src/broker/ServiceBroker.ts` (modifications)

```typescript
import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { randomUUID } from 'node:crypto';
import { ActionHandler, ActionRegistry } from './ActionRegistry.js';
import { BROKER_AMQP } from './tokens.js';
import { WorkflowRegistry, WORKFLOW_REGISTRY } from '../workflow/WorkflowRegistry.js';
import type { IdempotencyContext } from '../workflow/idempotency.js';

export interface ServiceBrokerOptions {
  serviceName: string;
}

@Injectable()
export class ServiceBroker implements OnModuleDestroy {
  private readonly logger = new Logger(ServiceBroker.name);
  private readonly localActions = new Set<string>();
  private inFlight = 0;

  constructor(
    private readonly registry: ActionRegistry,
    @Optional()
    @Inject(BROKER_AMQP)
    private readonly amqp: AmqpConnection | null,
    private readonly options: ServiceBrokerOptions,
    // WorkflowRegistry is optional - injected only when WorkflowModule is imported
    @Optional()
    @Inject(WORKFLOW_REGISTRY)
    private readonly workflowRegistry: WorkflowRegistry | null = null,
  ) {}

  // ... existing register(), call(), emit(), broadcast() methods ...

  /**
   * Execute workflow and wait for result.
   *
   * @example
   * const result = await broker.runWorkflow("project.storeCreate", input, {
   *   source: "client",
   *   clientKey: ctx.idempotencyKey,
   *   tenantId: ctx.organizationId,
   *   apiKeyId: ctx.apiKeyId,
   * });
   *
   * @throws Error if WorkflowModule is not imported (workflowRegistry is null)
   */
  async runWorkflow<TResult = unknown, TParams = unknown>(
    workflow: string,
    params: TParams,
    idempotencyCtx: IdempotencyContext,
  ): Promise<TResult> {
    if (!this.workflowRegistry) {
      throw new Error(
        'WorkflowRegistry not available. Import WorkflowModule.forRoot() in your app module.'
      );
    }

    const qualifiedWorkflow = this.assertFullyQualified(workflow);

    const handle = await this.workflowRegistry.start<TParams, TResult>(
      qualifiedWorkflow,
      params,
      idempotencyCtx,
    );
    return handle.getResult();
  }

  /**
   * Check if workflow is registered.
   * Returns false if WorkflowModule is not imported.
   */
  hasWorkflow(workflow: string): boolean {
    if (!this.workflowRegistry) {
      return false;
    }
    const qualifiedWorkflow = this.assertFullyQualified(workflow);
    return this.workflowRegistry.has(qualifiedWorkflow);
  }

  /**
   * Qualify action/workflow name with service prefix.
   * Made public for use by BrokerWorkflows.
   *
   * @example
   * broker.qualifyAction("storeCreate") // → "project.storeCreate"
   * broker.qualifyAction("iam.createUser") // → "iam.createUser" (unchanged)
   */
  qualifyAction(name: string): string {
    return name.includes('.') ? name : `${this.options.serviceName}.${name}`;
  }

  // ... existing private methods (assertFullyQualified remains private) ...
}
```

---

### Phase 6: Migration Example

#### Before (Current State)

```typescript
// services/project/src/workflows/StoreCreateWorkflow.ts
import { DBOS } from "@shopana/workflows";  // OLD IMPORT
import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";

export class StoreCreateWorkflow extends ConfiguredInstance {
  static workflowID(name: string): string {
    return `store:create:${name}`;
  }

  @DBOS.workflow()
  async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
    const storeId = await this.generateStoreId();
    await this.createStore(storeId, input);
    return { storeId };
  }

  @DBOS.step()
  async generateStoreId(): Promise<string> {
    return uuidv7();
  }
}

// Usage in resolver:
const workflow = this.workflowRegistry.get<StoreCreateWorkflow>("storeCreate");
const workflowID = StoreCreateWorkflow.workflowID(input.name);
const handle = await DBOS.startWorkflow(workflow, { workflowID }).run(input);
```

#### After (Target State)

```typescript
// services/project/src/ProjectBrokerWorkflows.ts
import { Injectable } from "@nestjs/common";
import { BrokerWorkflows, Workflow, Step } from "@shopana/shared-kernel";
import type { Kernel } from "./kernel/Kernel.js";
import type { Repository } from "./repositories/Repository.js";

@Injectable()
export class ProjectBrokerWorkflows extends BrokerWorkflows {
  // Type-safe repository access
  protected declare readonly repository: Repository;

  constructor(kernel: Kernel) {
    // Pass services interface, matching current BaseWorkflow pattern
    super("projectWorkflows", {
      broker: kernel.getServices().broker,
      workflow: kernel.workflow,
      repository: kernel.repository,
    });
  }

  /**
   * Main workflow entry point - MUST be named `run` for DBOS convention.
   * This matches the existing pattern: DBOS.startWorkflow(workflow).run(params)
   */
  @Workflow("storeCreate")
  async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
    const storeId = await this.generateStoreId();
    await this.createStoreRecord(storeId, input);
    await this.createRoles(storeId, input.organizationId, input.userId);
    return { storeId, organizationId: input.organizationId };
  }

  @Step()
  private async generateStoreId(): Promise<string> {
    return uuidv7();
  }

  @Step({ retriesAllowed: true, maxAttempts: 3 })
  private async createStoreRecord(
    storeId: string,
    input: StoreCreateInput,
  ): Promise<void> {
    await this.repository.store.create({ id: storeId, ...input });
  }

  @Step({ retriesAllowed: true, maxAttempts: 3 })
  private async createRoles(
    storeId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    await this.broker.call("iam.createRoles", {
      userId,
      organizationId: orgId,
      domain: `store:${storeId}`,
      roles: buildStoreRoles(),
    });
  }
}

// Registration in NestService (onModuleInit):
this.workflow.register(
  "storeCreate",
  new ProjectBrokerWorkflows(this.kernel)
);

// Usage in resolver:
const result = await this.broker.runWorkflow("project.storeCreate", input, {
  source: "client",
  clientKey: ctx.idempotencyKey,
  tenantId: ctx.organizationId,
  apiKeyId: ctx.apiKeyId,
});
```

---

## Сравнение API

| Aspect         | Actions                       | Workflows                                              |
| -------------- | ----------------------------- | ------------------------------------------------------ |
| Base class     | `BrokerActions`               | `BrokerWorkflows`                                      |
| Decorator      | `@Action(name)`               | `@Workflow(name)`                                      |
| Step decorator | N/A                           | `@Step(options?)`                                      |
| Registration   | Auto in `onModuleInit`        | Auto in `onModuleInit`                                 |
| Call method    | `broker.call(action, params)` | `broker.runWorkflow(workflow, params, idempotencyCtx)` |
| Idempotency    | Optional (manual)             | **Required** (enforced by API)                         |

---

## Files to Create/Modify

### New Files

```
packages/shared-kernel/src/workflow/                    # NEW FOLDER
packages/shared-kernel/src/workflow/WorkflowModule.ts   # FROM @shopana/workflows (modified)
packages/shared-kernel/src/workflow/WorkflowRegistry.ts # FROM @shopana/workflows (modified)
packages/shared-kernel/src/workflow/types.ts            # FROM @shopana/workflows
packages/shared-kernel/src/workflow/tokens.ts           # NEW (WORKFLOW_REGISTRY, WORKFLOW_CONFIG symbols)
packages/shared-kernel/src/workflow/idempotency.ts      # NEW
packages/shared-kernel/src/decorators/Workflow.ts       # NEW
packages/shared-kernel/src/decorators/Step.ts           # NEW
packages/shared-kernel/src/broker/BrokerWorkflows.ts    # NEW
```

### Modified Files

```
packages/shared-kernel/src/broker/ServiceBroker.ts      # Add runWorkflow(), hasWorkflow(), qualifyAction() public
packages/shared-kernel/src/broker/BrokerModule.ts       # Import WorkflowModule, inject WORKFLOW_REGISTRY (optional)
packages/shared-kernel/src/decorators/index.ts          # Export Workflow, Step
packages/shared-kernel/src/index.ts                     # Export all workflow-related (DBOS, WorkflowRegistry, etc.)
packages/shared-kernel/package.json                     # Add @dbos-inc/dbos-sdk, canonicalize
```

### Deleted

```
packages/workflows/                                     # ENTIRE PACKAGE DELETED
```

### Migration Files (All Services)

```
services/project/src/ProjectBrokerWorkflows.ts          # NEW (or keep existing workflow classes)
services/iam/src/IamBrokerWorkflows.ts                  # NEW (or keep existing workflow classes)
services/inventory/src/InventoryBrokerWorkflows.ts      # NEW (or keep existing workflow classes)
services/media/src/MediaBrokerWorkflows.ts              # NEW (or keep existing workflow classes)
services/*/src/workflows/BaseWorkflow.ts                # UPDATE to extend BrokerWorkflows OR keep as-is
services/*/src/workflows/*.ts                           # UPDATE imports OR DELETE if consolidated
services/*/src/*.nest-service.ts                        # UPDATE workflow registration
services/*/src/resolvers/**/*.ts                        # UPDATE to broker.runWorkflow()
services/*/package.json                                 # REMOVE @shopana/workflows dep
```

> **Migration Strategy Note:**
> Existing workflow classes (StoreCreateWorkflow, OrganizationCreateWorkflow, etc.) can be kept
> as-is with only import changes. The new BrokerWorkflows pattern is optional for new workflows.

---

## Dependencies

```bash
# In packages/shared-kernel
pnpm add @dbos-inc/dbos-sdk canonicalize
```

---

## Critical Notes

### Workflow Method Convention

**IMPORTANT:** All workflows MUST have a `run(params)` method as entry point.

This is required because:
1. Current codebase uses `DBOS.startWorkflow(workflow).run(params)` pattern
2. `WorkflowRegistry.start()` calls `.run(params)` on the workflow instance
3. DBOS expects consistent method naming for workflow invocation

```typescript
// ✅ CORRECT - entry point is `run`
@Workflow("storeCreate")
async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
  // workflow steps...
}

// ❌ WRONG - arbitrary method name
@Workflow("storeCreate")
async createStore(input: StoreCreateInput): Promise<StoreCreateOutput> {
  // This won't be called by WorkflowRegistry.start()!
}
```

### Idempotency Key Rules

1. **Никогда random** — Не использовать `randomUUID()`, `Date.now()`
2. **Business-derived** — Из productId, orderId, storeId и т.д.
3. **Уникальный в рамках workflow** — Разные вызовы = разные ключи

### Migration Strategy

1. **Phase 0** — Перенести `@shopana/workflows` в `@shopana/shared-kernel`
2. **Phase 1-5** — Добавить новую функциональность
3. **Phase 6** — Мигрировать все сервисы на новый API

---

## Implementation Order

1. **Phase 0** — Migrate @shopana/workflows → shared-kernel
2. **Phase 1** — Decorators (@Workflow, @Step)
3. **Phase 2** — Idempotency types
4. **Phase 3** — WorkflowRegistry updates
5. **Phase 4** — BrokerWorkflows base class
6. **Phase 5** — ServiceBroker updates
7. **Phase 6** — Migrate all services
