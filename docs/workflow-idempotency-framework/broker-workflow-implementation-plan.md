# Broker Workflow Implementation Plan

**Created**: 2026-01-20
**Based on**: idempotency-key-strategies.md, event-driven-architecture-implementation-plan.md
**Status**: Planning

---

## Обзор

Добавление метода `broker.runWorkflow()` для запуска зарегистрированных workflows аналогично тому, как регистрируются и вызываются actions через `broker.call()`.

### Ключевые требования

1. **BrokerWorkflow** — новый базовый класс по аналогии с `BrokerActions`
2. **Декларативная регистрация** — workflows регистрируются автоматически через декораторы
3. **DBOS под капотом** — декораторы `@Workflow`, `@Step` скрывают DBOS в shared-kernel
4. **Обязательный idempotency key** — на входе требуется ключ идемпотентности

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
│  └─ broker.register()             │  ├─ auto-registration        │
│                                   │  └─ broker.registerWorkflow()│
├─────────────────────────────────────────────────────────────────┤
│                        ServiceBroker                             │
│  ├─ register(action, handler)                                    │
│  ├─ call(action, params)                                         │
│  ├─ registerWorkflow(name, workflow)  [NEW]                      │
│  ├─ runWorkflow(name, params, idempotencyCtx)  [NEW]             │
│  └─ emit(event, payload)                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Tracker

### Phase 1: Decorators (`@shopana/shared-kernel`)

| #   | Task                                 | Status     | Notes                             |
| --- | ------------------------------------ | ---------- | --------------------------------- |
| 1.1 | Create `@Workflow` decorator         | ⬜ Pending | Re-export from DBOS with metadata |
| 1.2 | Create `@Step` decorator             | ⬜ Pending | Re-export from DBOS with metadata |
| 1.3 | Create `WorkflowMetadata` interface  | ⬜ Pending | name, idempotencyStrategy         |
| 1.4 | Create `StepMetadata` interface      | ⬜ Pending | name, retriesAllowed, etc.        |
| 1.5 | Export decorators from shared-kernel | ⬜ Pending | Update index.ts                   |

### Phase 2: Workflow Registry Updates (`@shopana/workflows`)

| #   | Task                                 | Status     | Notes                             |
| --- | ------------------------------------ | ---------- | --------------------------------- |
| 2.1 | Add `WorkflowDescriptor` interface   | ⬜ Pending | Metadata for registered workflows |
| 2.2 | Update `WorkflowRegistry.register()` | ⬜ Pending | Accept metadata                   |
| 2.3 | Add `WorkflowRegistry.getMetadata()` | ⬜ Pending | Get workflow metadata             |
| 2.4 | Add `WorkflowRegistry.start()`       | ⬜ Pending | Start with idempotency context    |
| 2.5 | Export updated types                 | ⬜ Pending | Update index.ts                   |

### Phase 3: BrokerWorkflows Base Class (`@shopana/shared-kernel`)

| #   | Task                                | Status     | Notes                            |
| --- | ----------------------------------- | ---------- | -------------------------------- |
| 3.1 | Create `BrokerWorkflows` base class | ⬜ Pending | Similar to BrokerActions         |
| 3.2 | Implement `onModuleInit()`          | ⬜ Pending | Auto-register workflows          |
| 3.3 | Add workflow scanning logic         | ⬜ Pending | Find @Workflow decorated methods |
| 3.4 | Export from shared-kernel           | ⬜ Pending | Update index.ts                  |

### Phase 4: ServiceBroker Updates (`@shopana/shared-kernel`)

| #   | Task                            | Status     | Notes                           |
| --- | ------------------------------- | ---------- | ------------------------------- |
| 4.1 | Add `registerWorkflow()` method | ⬜ Pending | Register workflow with metadata |
| 4.2 | Add `runWorkflow()` method      | ⬜ Pending | Run workflow with idempotency   |
| 4.3 | Add `hasWorkflow()` method      | ⬜ Pending | Check if workflow exists        |
| 4.4 | Add idempotency key builder     | ⬜ Pending | Build key from context          |

### Phase 5: Idempotency Context Types (`@shopana/shared-kernel`)

| #   | Task                                   | Status     | Notes                           |
| --- | -------------------------------------- | ---------- | ------------------------------- |
| 5.1 | Create `IdempotencyContext` union type | ⬜ Pending | Client, Workflow, Content, None |
| 5.2 | Create `ClientIdempotencyContext`      | ⬜ Pending | External API calls              |
| 5.3 | Create `WorkflowIdempotencyContext`    | ⬜ Pending | Internal workflow calls         |
| 5.4 | Create `ContentIdempotencyContext`     | ⬜ Pending | Content-hash based              |
| 5.5 | Create `buildIdempotencyKey()` utility | ⬜ Pending | Build final key from context    |

### Phase 6: Migration Example (Project Service)

| #   | Task                                     | Status     | Notes                    |
| --- | ---------------------------------------- | ---------- | ------------------------ |
| 6.1 | Create `ProjectBrokerWorkflows` class    | ⬜ Pending | Example implementation   |
| 6.2 | Migrate `StoreCreateWorkflow`            | ⬜ Pending | Use new decorators       |
| 6.3 | Update module registration               | ⬜ Pending | Use BrokerWorkflows      |
| 6.4 | Update resolver to use broker.runWorkflow() | ⬜ Pending | With idempotency context |

---

## Detailed Implementation

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

### Phase 2: Workflow Registry Updates

#### 2.1-2.4 WorkflowRegistry Updates

**File**: `packages/workflows/src/WorkflowRegistry.ts`

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { DBOS } from "@dbos-inc/dbos-sdk";
import type {
  WorkflowHandle,
  DBOSWorkflowStatus,
  IdempotencyContext,
} from "./types.js";
import { buildIdempotencyKey } from "./idempotency.js";

export interface WorkflowDescriptor {
  /** Workflow instance (ConfiguredInstance) */
  instance: unknown;
  /** Method name to call */
  methodName: string;
  /** Workflow metadata */
  metadata: {
    name: string;
    idempotencyStrategy?: "client" | "workflow" | "content";
  };
}

@Injectable()
export class WorkflowRegistry {
  private readonly logger = new Logger(WorkflowRegistry.name);
  private readonly workflows = new Map<string, WorkflowDescriptor>();

  /**
   * Register workflow with metadata.
   * Called automatically by BrokerWorkflows.
   */
  register(qualifiedName: string, descriptor: WorkflowDescriptor): void {
    if (this.workflows.has(qualifiedName)) {
      throw new Error(`Workflow "${qualifiedName}" already registered`);
    }
    this.workflows.set(qualifiedName, descriptor);
    this.logger.debug(`Registered workflow: ${qualifiedName}`);
  }

  /**
   * Deregister workflow (for graceful shutdown)
   */
  deregister(qualifiedName: string): void {
    this.workflows.delete(qualifiedName);
  }

  /**
   * Get workflow descriptor by qualified name
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
   * Get workflow instance by name (legacy support)
   */
  get<T>(name: string): T {
    const descriptor = this.getDescriptor(name);
    return descriptor.instance as T;
  }

  /**
   * Check if workflow is registered
   */
  has(qualifiedName: string): boolean {
    return this.workflows.has(qualifiedName);
  }

  /**
   * Get list of registered workflows
   */
  list(): string[] {
    return Array.from(this.workflows.keys());
  }

  /**
   * Start workflow with idempotency context.
   * Builds deterministic workflowID from context.
   *
   * @param qualifiedName - Fully qualified workflow name (e.g., "project.storeCreate")
   * @param params - Workflow input parameters
   * @param idempotencyCtx - Idempotency context for deterministic ID
   * @returns Workflow handle for monitoring
   */
  async start<TParams, TResult>(
    qualifiedName: string,
    params: TParams,
    idempotencyCtx: IdempotencyContext,
  ): Promise<WorkflowHandle<TResult>> {
    const descriptor = this.getDescriptor(qualifiedName);
    const { instance, methodName } = descriptor;

    // Build deterministic workflow ID
    const workflowID = buildIdempotencyKey(qualifiedName, idempotencyCtx);

    // Get the workflow method
    const workflowMethod = (instance as Record<string, unknown>)[
      methodName
    ] as (params: TParams) => Promise<TResult>;

    // Start workflow using DBOS
    const handle = await DBOS.startWorkflow(instance, { workflowID })[
      methodName
    ](params);

    return {
      workflowId: workflowID,
      getResult: () => handle.getResult(),
      getStatus: () => handle.getStatus(),
    };
  }

  /**
   * Execute workflow and wait for result.
   *
   * @param qualifiedName - Fully qualified workflow name
   * @param params - Workflow input parameters
   * @param idempotencyCtx - Idempotency context
   * @returns Workflow result
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
   * Get handle to existing workflow by ID
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

### Phase 3: BrokerWorkflows Base Class

**File**: `packages/shared-kernel/src/broker/BrokerWorkflows.ts`

```typescript
import { Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import { ServiceBroker } from "./ServiceBroker.js";
import { WorkflowRegistry } from "@shopana/workflows";
import {
  WORKFLOW_METADATA_KEY,
  type WorkflowMetadata,
} from "../decorators/Workflow.js";
import "reflect-metadata";

export interface BrokerWorkflowServices {
  broker: ServiceBroker;
  workflowRegistry: WorkflowRegistry;
}

/**
 * Base class for services that register broker workflows.
 * Subclasses use @Workflow decorator on methods to automatically register them.
 *
 * @example
 * @Injectable()
 * class ProjectWorkflows extends BrokerWorkflows {
 *   constructor(
 *     @InjectBroker("project") broker: ServiceBroker,
 *     @Inject(WORKFLOW_REGISTRY) workflowRegistry: WorkflowRegistry
 *   ) {
 *     super("projectWorkflows", { broker, workflowRegistry });
 *   }
 *
 *   @Workflow("storeCreate")
 *   async createStore(input: StoreCreateInput): Promise<StoreCreateOutput> {
 *     const storeId = await this.generateId();
 *     await this.createStoreRecord(storeId, input);
 *     return { storeId };
 *   }
 *
 *   @Step()
 *   async generateId(): Promise<string> {
 *     return uuidv7();
 *   }
 *
 *   @Step({ retriesAllowed: true, maxAttempts: 3 })
 *   async createStoreRecord(storeId: string, input: StoreCreateInput): Promise<void> {
 *     await this.repository.store.create({ id: storeId, ...input });
 *   }
 * }
 *
 * // Usage in resolver:
 * await broker.runWorkflow("project.storeCreate", input, {
 *   source: "client",
 *   clientKey: idempotencyKey,
 *   tenantId: ctx.organizationId,
 *   apiKeyId: ctx.apiKeyId,
 * });
 */
export abstract class BrokerWorkflows
  extends ConfiguredInstance
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger: Logger;
  protected readonly broker: ServiceBroker;
  protected readonly workflowRegistry: WorkflowRegistry;
  private readonly registeredWorkflows: string[] = [];

  constructor(name: string, services: BrokerWorkflowServices) {
    super(name);
    this.broker = services.broker;
    this.workflowRegistry = services.workflowRegistry;
    this.logger = new Logger(this.constructor.name);
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
   * Deregisters all workflows.
   */
  onModuleDestroy(): void {
    for (const workflowName of this.registeredWorkflows) {
      this.workflowRegistry.deregister(workflowName);
    }
    this.registeredWorkflows.length = 0;
  }

  /**
   * Get broker for calling other services
   */
  protected getBroker(): ServiceBroker {
    return this.broker;
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
          methodName,
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

### Phase 4: ServiceBroker Updates

**File**: `packages/shared-kernel/src/broker/ServiceBroker.ts` (additions)

```typescript
import type { IdempotencyContext, WorkflowHandle } from "./types.js";
import { WorkflowRegistry } from "@shopana/workflows";

export class ServiceBroker implements OnModuleDestroy {
  // ... existing code ...

  constructor(
    private readonly registry: ActionRegistry,
    private readonly workflowRegistry: WorkflowRegistry, // NEW
    @Optional()
    @Inject(BROKER_AMQP)
    private readonly amqp: AmqpConnection | null,
    private readonly options: ServiceBrokerOptions,
  ) {}

  /**
   * Execute workflow and wait for result.
   *
   * @param workflow - Fully qualified workflow name (e.g., "project.storeCreate")
   * @param params - Workflow input parameters
   * @param idempotencyCtx - Idempotency context (required)
   * @returns Workflow result
   *
   * @example
   * // Client-provided idempotency key (external API)
   * const result = await broker.runWorkflow("project.storeCreate", input, {
   *   source: "client",
   *   clientKey: "user-store-123",
   *   tenantId: ctx.organizationId,
   *   apiKeyId: ctx.apiKeyId,
   * });
   *
   * // Workflow-derived key (internal)
   * const result = await broker.runWorkflow("inventory.createRecord", input, {
   *   source: "workflow",
   *   workflowId: DBOS.workflowID,
   *   stepId: "createInventory",
   *   callId: productId,
   * });
   *
   * // Content-derived key (idempotent updates)
   * const result = await broker.runWorkflow("inventory.setStock", input, {
   *   source: "content",
   *   resourceId: sku,
   *   operation: "setStock",
   *   contentHash: sha256(canonicalJson(input)),
   * });
   */
  async runWorkflow<TResult = unknown, TParams = unknown>(
    workflow: string,
    params: TParams,
    idempotencyCtx: IdempotencyContext,
  ): Promise<TResult> {
    const qualifiedWorkflow = this.assertFullyQualified(workflow);

    // Validate idempotency context
    if (!idempotencyCtx || idempotencyCtx.source === "none") {
      throw new Error(
        `Idempotency context required for workflow "${qualifiedWorkflow}". ` +
          `Use source: "client" | "workflow" | "content"`,
      );
    }

    const handle = await this.workflowRegistry.start<TParams, TResult>(
      qualifiedWorkflow,
      params,
      idempotencyCtx,
    );
    return handle.getResult();
  }

  /**
   * Check if workflow is registered
   */
  hasWorkflow(workflow: string): boolean {
    const qualifiedWorkflow = this.assertFullyQualified(workflow);
    return this.workflowRegistry.has(qualifiedWorkflow);
  }

  /**
   * Qualify action/workflow name with service prefix
   */
  qualifyAction(name: string): string {
    return name.includes(".") ? name : `${this.options.serviceName}.${name}`;
  }
}
```

---

### Phase 5: Idempotency Context Types

**File**: `packages/shared-kernel/src/broker/types.ts`

```typescript
import { createHash } from "node:crypto";
import canonicalize from "canonicalize";

/**
 * Client-provided idempotency key (External API).
 * Used for requests from external clients via HTTP Idempotency-Key header.
 *
 * Scope: tenant + api_key + provided_key
 * TTL: 24 hours
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
 *
 * Scope: service + workflow
 * TTL: Depends on operation type
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
 *
 * Scope: resource + action
 * TTL: 1 hour
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
 * Explicit no-idempotency (READ operations).
 * Use sparingly - prefer explicit idempotency.
 */
export interface NoIdempotencyContext {
  source: "none";
}

/**
 * Union type for all idempotency contexts
 */
export type IdempotencyContext =
  | ClientIdempotencyContext
  | WorkflowIdempotencyContext
  | ContentIdempotencyContext
  | NoIdempotencyContext;

/**
 * Build deterministic idempotency key from context.
 *
 * Key format:
 * - client:   `client:{sha256(tenantId:apiKeyId:workflowName:clientKey)}`
 * - workflow: `workflow:{sha256(workflowId:stepId:callId:workflowName)}`
 * - content:  `content:{sha256(resourceId:operation:contentHash:workflowName)}`
 *
 * @param workflowName - Fully qualified workflow name
 * @param ctx - Idempotency context
 * @returns Deterministic workflow ID
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

    case "none":
      throw new Error("Cannot build idempotency key for source: none");

    default:
      throw new Error(
        `Unknown idempotency source: ${(ctx as IdempotencyContext).source}`,
      );
  }
}

/**
 * Helper to create content hash for ContentIdempotencyContext.
 *
 * @param payload - Payload to hash
 * @returns SHA256 hash of canonicalized JSON
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

### Phase 6: Migration Example

#### Before (Current State)

```typescript
// services/project/src/workflows/StoreCreateWorkflow.ts
import { DBOS } from "@shopana/workflows";
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
import { Injectable, Inject } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  Step,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { WORKFLOW_REGISTRY, WorkflowRegistry } from "@shopana/workflows";

@Injectable()
export class ProjectBrokerWorkflows extends BrokerWorkflows {
  constructor(
    @InjectBroker("project") broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) workflowRegistry: WorkflowRegistry,
  ) {
    super("projectWorkflows", { broker, workflowRegistry });
  }

  @Workflow("storeCreate", { idempotencyStrategy: "client" })
  async createStore(input: StoreCreateInput): Promise<StoreCreateOutput> {
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

// Usage in resolver:
const result = await this.broker.runWorkflow("project.storeCreate", input, {
  source: "client",
  clientKey: ctx.idempotencyKey, // From HTTP header
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
packages/shared-kernel/src/decorators/Workflow.ts
packages/shared-kernel/src/decorators/Step.ts
packages/shared-kernel/src/broker/BrokerWorkflows.ts
packages/shared-kernel/src/broker/idempotency.ts
```

### Modified Files

```
packages/shared-kernel/src/broker/ServiceBroker.ts
packages/shared-kernel/src/broker/types.ts
packages/shared-kernel/src/index.ts
packages/workflows/src/WorkflowRegistry.ts
packages/workflows/src/types.ts
packages/workflows/src/index.ts
```

### Migration Files (Example)

```
services/project/src/ProjectBrokerWorkflows.ts (new)
services/project/src/project.module.ts (update)
services/project/src/resolvers/admin/StoreMutationResolver.ts (update)
```

---

## Dependencies

```bash
# In packages/shared-kernel
pnpm add canonicalize

# Types already available from @dbos-inc/dbos-sdk
```

---

## Critical Notes

### Idempotency Key Rules

1. **Никогда random** — Не использовать `randomUUID()`, `Date.now()`
2. **Business-derived** — Из productId, orderId, storeId и т.д.
3. **Уникальный в рамках workflow** — Разные вызовы = разные ключи

### Migration Strategy

1. Создать новые классы `*BrokerWorkflows` рядом с существующими
2. Постепенно переносить workflows
3. Обновлять resolvers для использования `broker.runWorkflow()`
4. Удалить старые классы после полной миграции

### Backward Compatibility

- Существующий `WorkflowRegistry.get()` сохраняется
- `DBOS.startWorkflow()` можно использовать напрямую
- Новый API не ломает существующий код

---

## Implementation Order

1. **Phase 1** — Decorators (основа)
2. **Phase 5** — Idempotency types (нужны для ServiceBroker)
3. **Phase 2** — WorkflowRegistry updates
4. **Phase 3** — BrokerWorkflows base class
5. **Phase 4** — ServiceBroker updates
6. **Phase 6** — Migration example (validation)
