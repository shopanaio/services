# Saga Engine Design

## Overview

Enterprise-grade Saga Engine для декларативного определения распределённых транзакций с автоматическим выполнением компенсаций. Основан на существующей broker/workflow инфраструктуре (DBOS).

## Архитектура

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Saga Definition                              │
│                                                                      │
│  @Saga("storeCreate")                                                │
│  async run(input) {                                                  │
│    const id = await this.generateId();          ──┐                 │
│    await this.createStore(id, input);             │ @SagaStep()     │
│    await this.createRoles(id, input);           ──┘                 │
│    return { storeId: id };                                           │
│  }                                                                   │
│                                                                      │
│  compensateCreateStore(id)    ← convention-based                    │
│  compensateCreateRoles(id)    ← same args as step                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AsyncLocalStorage Context                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ executedSteps: [                                              │   │
│  │   { method: "generateId", args: [], result: "abc123" },       │   │
│  │   { method: "createStore", args: ["abc123", input] },         │   │
│  │   { method: "createRoles", args: ["abc123", input] },         │   │
│  │ ]                                                             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  On error → compensations in reverse order with same args           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Broker Infrastructure                             │
│  ┌────────────┐  ┌─────────────────┐  ┌────────────────┐            │
│  │ ServiceBroker │  WorkflowRegistry │  │ ActionRegistry │            │
│  └────────────┘  └─────────────────┘  └────────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

## Компоненты

### 1. Типы и интерфейсы

**Файл:** `packages/shared-kernel/src/saga/types.ts`

```typescript
/** Результат выполнения шага (fully serializable) */
export interface StepResult<T = unknown> {
  success: boolean;
  data?: T;
  /** Serializable error info (not Error object) */
  error?: ErrorInfo;
}

/** Retry policy */
export interface RetryPolicy {
  maxAttempts: number;
  intervalSeconds: number;
  backoffRate: number;
}

// ─────────────────────────────────────────────────────────────────
// Error Classification (same pattern as broker actions/events)
// ─────────────────────────────────────────────────────────────────

/**
 * Base class for saga errors with retry classification.
 */
export abstract class SagaError extends Error {
  abstract readonly retryable: boolean;
  /** Optional error code for API responses */
  code?: string;
}

/**
 * Transient error - can be retried (network issues, timeouts, service unavailable).
 * SagaExecutor will retry according to step's retry policy.
 */
export class RetryableError extends SagaError {
  readonly retryable = true;

  constructor(message: string, cause?: Error) {
    // Node 16+ supports cause in options
    super(message, cause ? { cause } : undefined);
    this.name = "RetryableError";
    this.code = "RETRYABLE_ERROR";
  }
}

/**
 * Fatal error - cannot be retried (validation, business logic, not found).
 * SagaExecutor will immediately trigger compensation.
 */
export class FatalError extends SagaError {
  readonly retryable = false;

  constructor(message: string, cause?: Error, code?: string) {
    super(message, cause ? { cause } : undefined);
    this.name = "FatalError";
    this.code = code ?? "FATAL_ERROR";
  }
}

/**
 * Helper to classify unknown errors.
 * IMPORTANT: Unknown errors are treated as FATAL by default.
 * Only explicitly retryable patterns trigger retry.
 *
 * Rationale: Unknown errors often indicate bugs, type errors, invariant
 * violations - retrying them wastes resources and delays compensation.
 */
export function isRetryableError(error: unknown): boolean {
  // Explicit classification via SagaError subclasses
  if (error instanceof SagaError) {
    return error.retryable;
  }

  // Network/connection errors are retryable
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    const retryablePatterns = [
      "econnrefused",
      "econnreset",
      "etimedout",
      "enotfound",
      "socket hang up",
      "network",
      "timeout",
      "unavailable",
      "service_unavailable",
      "503",
      "502",
      "504",
    ];

    if (retryablePatterns.some((p) => message.includes(p) || name.includes(p))) {
      return true;
    }
  }

  // Unknown errors → FATAL (no retry)
  // Forces explicit classification via RetryableError/FatalError
  return false;
}

import { createHash } from "node:crypto";

/**
 * Deterministic hash using Node.js crypto (stable, well-tested).
 * Returns value in 0-1 range for jitter calculation.
 */
function deterministicHash(seed: string): number {
  const hash = createHash("sha256").update(seed).digest();
  // Use first 4 bytes as uint32, normalize to 0-1
  const uint32 = hash.readUInt32BE(0);
  return uint32 / 0xFFFFFFFF;
}

/**
 * Add deterministic jitter to prevent thundering herd.
 * Returns interval with ±25% variance based on hash of seed.
 *
 * IMPORTANT: Workflows must be deterministic - no Math.random()!
 * Jitter is derived from sagaId + stepName + attempt for reproducibility.
 *
 * @param intervalMs - Base interval
 * @param seed - Deterministic seed (sagaId:stepName:attempt)
 */
export function addJitter(intervalMs: number, seed: string): number {
  const jitter = intervalMs * 0.25;
  const hashValue = deterministicHash(seed);
  // Map hash (0-1) to range (-1, 1)
  return Math.round(intervalMs + (hashValue * 2 - 1) * jitter);
}

/** Состояние выполнения саги */
export type SagaStatus =
  | "pending"
  | "running"
  | "completed"
  | "compensating"
  | "compensated"
  | "failed";

/** Serializable error info (for GraphQL/logging) */
export interface ErrorInfo {
  name: string;
  message: string;
  code?: string;
  stack?: string;
}

/** Convert Error to serializable shape */
export function toErrorInfo(error: Error): ErrorInfo {
  return {
    name: error.name,
    message: error.message,
    code: (error as any).code,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  };
}

/** Выполненный шаг (для компенсации) */
export interface ExecutedStep {
  method: string;
  args: unknown[];
  result: unknown;
}

/** Результат выполнения саги (fully serializable) */
export interface SagaResult<TOutput = unknown> {
  success: boolean;
  status: SagaStatus;
  data?: TOutput;
  /** Error info (serializable) */
  error?: ErrorInfo;
  /** Steps that succeeded */
  succeededSteps: string[];
  /** Steps that were successfully compensated */
  compensatedSteps: string[];
  /** Whether all compensations succeeded */
  compensated: boolean;
  /** Compensation errors (serializable) */
  compensationErrors: ErrorInfo[];
}
```

### 2. SagaExecutionContext

**Файл:** `packages/shared-kernel/src/saga/SagaExecutionContext.ts`

```typescript
import { AsyncLocalStorage } from "node:async_hooks";

/** Выполненный шаг (для компенсации) */
export interface ExecutedStep {
  method: string;
  args: unknown[];
  result: unknown;
}

/**
 * Контекст выполнения саги.
 * Хранит стек выполненных шагов для компенсации.
 */
export class SagaExecutionContext {
  readonly sagaId: string;
  private executedSteps: ExecutedStep[] = [];
  private compensatedSteps: string[] = [];

  constructor(sagaId: string) {
    this.sagaId = sagaId;
  }

  /** Записать успешно выполненный шаг */
  recordStep(method: string, args: unknown[], result: unknown): void {
    this.executedSteps.push({ method, args, result });
  }

  /** Получить шаги для компенсации (в обратном порядке) */
  getStepsToCompensate(): ExecutedStep[] {
    return [...this.executedSteps].reverse();
  }

  /** Отметить шаг как скомпенсированный */
  markCompensated(method: string): void {
    this.compensatedSteps.push(method);
  }

  /** Получить список скомпенсированных шагов */
  getCompensatedSteps(): string[] {
    return [...this.compensatedSteps];
  }
}

/** AsyncLocalStorage для передачи контекста через async calls */
export const sagaContextStorage = new AsyncLocalStorage<SagaExecutionContext>();

/** Получить текущий контекст (throws если вне саги) */
export function getSagaContext(): SagaExecutionContext {
  const ctx = sagaContextStorage.getStore();
  if (!ctx) {
    throw new Error("SagaStep called outside of saga execution context");
  }
  return ctx;
}
```

### 3. Декораторы

**Файл:** `packages/shared-kernel/src/saga/decorators.ts`

```typescript
import "reflect-metadata";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { Logger } from "@nestjs/common";
import { SagaExecutionContext, sagaContextStorage, getSagaContext } from "./SagaExecutionContext.js";

export const SAGA_DEFINITION_KEY = Symbol("saga:definition");

const logger = new Logger("SagaEngine");

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * @SagaStep() — маркирует метод как durable шаг саги.
 *
 * При вызове:
 * 1. Выполняет метод
 * 2. Записывает { method, args, result } в контекст
 * 3. При ошибке в саге — вызывается compensate{MethodName}(...args)
 *
 * @example
 * @SagaStep()
 * private async createStore(id: string, input: Input): Promise<void> {
 *   await this.kernel.repository.store.create({ id, ...input });
 * }
 *
 * // Compensation receives same args
 * async compensateCreateStore(id: string): Promise<void> {
 *   await this.kernel.repository.store.delete(id);
 * }
 */
export function SagaStep(): MethodDecorator {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value as Function;
    const methodName = propertyKey as string;

    (descriptor as any).value = async function(...args: unknown[]) {
      const ctx = getSagaContext();

      // Выполняем шаг
      const result = await originalMethod.apply(this, args);

      // Записываем успешный шаг
      ctx.recordStep(methodName, args, result);

      return result;
    };

    // DBOS.step for durability
    return DBOS.step({
      retriesAllowed: false,
      maxAttempts: 1,
    })(target, propertyKey as string, descriptor);
  };
}

/**
 * @Saga("name") — маркирует метод run() как точку входа саги.
 *
 * При ошибке автоматически запускает компенсации в обратном порядке.
 * Компенсация вызывается с теми же аргументами что и оригинальный шаг.
 *
 * @example
 * @Saga("storeCreate")
 * async run(input: Input): Promise<Output> {
 *   const storeId = await this.generateId();
 *   await this.createStore(storeId, input);
 *   await this.createRoles(storeId, input);
 *   return { storeId, organizationId: input.organizationId };
 * }
 */
export function Saga(name: string): MethodDecorator {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value as Function;

    // Store metadata for registration
    Reflect.defineMetadata(SAGA_DEFINITION_KEY, { name }, target.constructor);

    (descriptor as any).value = async function(input: unknown): Promise<SagaResult> {
      const sagaId = DBOS.workflowID;
      const ctx = new SagaExecutionContext(sagaId);
      const compensationErrors: Error[] = [];

      try {
        // Execute saga within AsyncLocalStorage context
        const result = await sagaContextStorage.run(ctx, async () => {
          return originalMethod.call(this, input);
        });

        return {
          success: true,
          status: "completed" as SagaStatus,
          data: result,
          attempts: {},
          succeededSteps: ctx.getStepsToCompensate().map(s => s.method).reverse(),
          compensatedSteps: [],
          compensated: false,
          compensationErrors: [],
          warnings: [],
        };

      } catch (error) {
        logger.error(`Saga ${name} failed, starting compensation`, error);

        // ═══════════════════════════════════════════════════════
        // COMPENSATION PHASE
        // ═══════════════════════════════════════════════════════
        const stepsToCompensate = ctx.getStepsToCompensate();

        for (const step of stepsToCompensate) {
          const compensateMethod = `compensate${capitalize(step.method)}`;

          // Check if compensation method exists
          if (typeof (this as any)[compensateMethod] !== "function") {
            logger.debug(`No compensation for step: ${step.method}, skipping`);
            continue;
          }

          try {
            // Вызываем компенсацию с теми же аргументами
            await (this as any)[compensateMethod](...step.args);
            ctx.markCompensated(step.method);
            logger.debug(`Compensated: ${step.method}`);
          } catch (compError) {
            logger.error(`Compensation ${compensateMethod} failed`, compError);
            compensationErrors.push(compError as Error);
          }
        }

        const status: SagaStatus = compensationErrors.length > 0 ? "failed" : "compensated";

        return {
          success: false,
          status,
          error: toErrorInfo(error as Error),
          attempts: {},
          succeededSteps: stepsToCompensate.map(s => s.method).reverse(),
          compensatedSteps: ctx.getCompensatedSteps(),
          compensated: compensationErrors.length === 0,
          compensationErrors: compensationErrors.map(toErrorInfo),
          warnings: [],
        };
      }
    };

    // DBOS.workflow for durability
    return DBOS.workflow()(target, propertyKey as string, descriptor);
  };
}
```

### 4. BrokerSaga Base Class

**Файл:** `packages/shared-kernel/src/saga/BrokerSaga.ts`

```typescript
import { Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import { ServiceBroker } from "../broker/ServiceBroker.js";
import { WorkflowRegistry } from "../workflow/WorkflowRegistry.js";
import { SAGA_DEFINITION_KEY } from "./decorators.js";

/**
 * Базовый класс для саг с broker интеграцией.
 *
 * @example
 * @Injectable()
 * export class StoreCreateSaga extends BrokerSaga<StoreInput, StoreOutput> {
 *
 *   @Saga("storeCreate")
 *   async run(input: StoreInput): Promise<StoreOutput> {
 *     const storeId = await this.generateId();
 *     await this.createStore(storeId, input);
 *     await this.createRoles(storeId, input);
 *     return { storeId, organizationId: input.organizationId };
 *   }
 *
 *   @SagaStep()
 *   private async generateId(): Promise<string> {
 *     return uuidv7();
 *   }
 *
 *   @SagaStep()
 *   private async createStore(id: string, input: StoreInput): Promise<void> {
 *     await this.kernel.repository.store.create({ id, ...input });
 *   }
 *
 *   async compensateCreateStore(id: string): Promise<void> {
 *     await this.kernel.repository.store.delete(id);
 *   }
 *
 *   @SagaStep()
 *   private async createRoles(id: string, input: StoreInput): Promise<void> {
 *     await this.broker.call("iam.createRoles", { domain: `store:${id}` });
 *   }
 *
 *   async compensateCreateRoles(id: string): Promise<void> {
 *     await this.broker.call("iam.deleteRoles", { domain: `store:${id}` });
 *   }
 * }
 */
export abstract class BrokerSaga<TInput, TOutput>
  extends ConfiguredInstance
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger: Logger;

  constructor(public readonly broker: ServiceBroker) {
    super(new.target.name);
    this.logger = new Logger(this.constructor.name);
  }

  /** Доступ к workflow registry */
  protected get workflowRegistry(): WorkflowRegistry {
    return this.broker.getWorkflowRegistry();
  }

  /**
   * Точка входа саги — должна быть decorated с @Saga("name")
   */
  abstract run(input: TInput): Promise<TOutput>;

  onModuleInit(): void {
    this.registerSaga();
  }

  onModuleDestroy(): void {
    this.deregisterSaga();
  }

  private registerSaga(): void {
    const sagaMeta = Reflect.getMetadata(SAGA_DEFINITION_KEY, this.constructor);
    if (!sagaMeta) {
      throw new Error(`@Saga decorator missing on ${this.constructor.name}.run()`);
    }

    const qualifiedName = this.broker.qualifyAction(sagaMeta.name);

    this.workflowRegistry.register(qualifiedName, {
      instance: this,
      metadata: { name: sagaMeta.name },
    });

    this.logger.debug(`Registered saga: ${qualifiedName}`);
  }

  private deregisterSaga(): void {
    const sagaMeta = Reflect.getMetadata(SAGA_DEFINITION_KEY, this.constructor);
    if (sagaMeta) {
      const qualifiedName = this.broker.qualifyAction(sagaMeta.name);
      this.workflowRegistry.deregister(qualifiedName);
    }
  }
}
```

### 5. Интеграция с ServiceBroker

**Файл:** `packages/shared-kernel/src/broker/ServiceBroker.ts` (additions)

```typescript
// Добавить метод для запуска саги
async runSaga<TResult, TParams>(
  sagaName: string,
  params: TParams,
): Promise<SagaResult<TResult>> {
  // Использует тот же механизм, что и runWorkflow
  return this.runWorkflow<SagaResult<TResult>, TParams>(
    sagaName,
    params,
  );
}
```

## Пример использования: StoreCreateSaga

**Файл:** `services/project/src/sagas/StoreCreateSaga.ts`

```typescript
import { Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { IAM } from "@shopana/broker-types";
import { v7 as uuidv7 } from "uuid";
import { Kernel } from "../kernel/Kernel.js";

export interface StoreCreateInput {
  name: string;
  displayName: string;
  locales: LocaleCode[];
  currencies: CurrencyCode[];
  defaultCurrency: CurrencyCode;
  organizationId: string;
  userId: string;
}

export interface StoreCreateOutput {
  storeId: string;
  organizationId: string;
}

@Injectable()
export class StoreCreateSaga extends BrokerSaga<StoreCreateInput, StoreCreateOutput> {
  constructor(@InjectBroker("project") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  // ═══════════════════════════════════════════════════════════════
  // SAGA ENTRY POINT
  // ═══════════════════════════════════════════════════════════════

  @Saga("storeCreate")
  async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
    const storeId = await this.generateId();
    await this.createStore(storeId, input);
    await this.createRoles(storeId, input);
    return { storeId, organizationId: input.organizationId };
  }

  // ═══════════════════════════════════════════════════════════════
  // STEPS — durable, автоматически трекаются
  // ═══════════════════════════════════════════════════════════════

  @SagaStep()
  private async generateId(): Promise<string> {
    return uuidv7();
  }
  // No compensateGenerateId — pure function, no side effects

  @SagaStep()
  private async createStore(id: string, input: StoreCreateInput): Promise<void> {
    await this.kernel.repository.store.create({
      id,
      organizationId: input.organizationId,
      name: input.name,
      displayName: input.displayName,
      locales: input.locales,
      currencies: input.currencies,
      defaultCurrency: input.defaultCurrency,
    });
  }

  @SagaStep()
  private async createRoles(id: string, input: StoreCreateInput): Promise<void> {
    await this.broker.call("iam.createRoles", { domain: `store:${id}` });
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPENSATIONS — convention: compensate{PascalCase(methodName)}
  // Called with the SAME arguments as the original step
  // ═══════════════════════════════════════════════════════════════

  async compensateCreateStore(id: string): Promise<void> {
    await this.kernel.repository.store.delete(id);
  }

  async compensateCreateRoles(id: string): Promise<void> {
    await this.broker.call("iam.deleteRoles", { domain: `store:${id}` });
  }
}
```

## Использование в Resolver

```typescript
@Mutation(() => StorePayload)
async storeCreate(
  @Args("input") input: StoreCreateInput,
  @Ctx() ctx: GraphQLContext,
): Promise<StorePayload> {
  const result = await this.broker.runSaga<StoreCreateOutput, StoreCreateInput>(
    "project.storeCreate",
    {
      ...input,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
    },
  );

  if (!result.success) {
    if (result.compensated) {
      throw new UserInputError("Store creation failed and was rolled back", {
        originalError: result.error?.message,
      });
    } else {
      throw new InternalServerError("Store creation failed with partial rollback", {
        originalError: result.error?.message,
        compensationErrors: result.compensationErrors.map(e => e.message),
      });
    }
  }

  return {
    store: await this.storeService.findById(result.data!.storeId),
    userErrors: [],
  };
}
```

## Структура файлов

```
packages/shared-kernel/src/saga/
├── index.ts                    # Public exports
├── types.ts                    # SagaResult, ErrorInfo, RetryPolicy, Errors
├── SagaExecutionContext.ts     # AsyncLocalStorage context
├── decorators.ts               # @Saga, @SagaStep
└── BrokerSaga.ts               # Базовый класс
```

### Public API (index.ts exports)

```typescript
// Decorators
export { Saga, SagaStep } from "./decorators.js";

// Base class
export { BrokerSaga } from "./BrokerSaga.js";

// Context (for advanced usage)
export {
  SagaExecutionContext,
  sagaContextStorage,
  getSagaContext,
} from "./SagaExecutionContext.js";

// Types
export type {
  SagaContext,
  SagaResult,
  SagaStatus,
  StepResult,
  RetryPolicy,
  ErrorInfo,
  ExecutedStep,
} from "./types.js";

// Errors
export {
  SagaError,
  RetryableError,
  FatalError,
  isRetryableError,
  toErrorInfo,
  addJitter,
} from "./types.js";
```

## Error Classification Pattern

Паттерн классификации ошибок аналогичен broker actions/events:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Step Execution                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Error thrown │
                    └───────┬───────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
     ┌────────────────┐          ┌────────────────┐
     │ RetryableError │          │  FatalError    │
     │ (transient)    │          │  (business)    │
     └───────┬────────┘          └───────┬────────┘
             │                           │
             ▼                           │
     ┌────────────────┐                  │
     │ Retry with     │                  │
     │ backoff        │                  │
     └───────┬────────┘                  │
             │                           │
             │ max attempts              │
             │ exceeded                  │
             │                           │
             └───────────┬───────────────┘
                         │
                         ▼
              ┌────────────────────┐
              │ Run compensations  │
              │ in reverse order   │
              └────────────────────┘
```

### When to use each error type

| Error Type | When to Use | Examples |
|------------|-------------|----------|
| `RetryableError` | Transient failures that may succeed on retry | Network timeout, service unavailable, 502/503/504 |
| `FatalError` | Business/validation errors that won't change | Invalid input, resource not found, conflict |
| Unknown errors | Classified via `isRetryableError()` | **Default: FATAL** (no retry) |

**Why unknown = FATAL?**
- Unknown errors often indicate bugs, TypeErrors, invariant violations
- Retrying them wastes resources and delays compensation
- Forces explicit classification via `RetryableError`/`FatalError`
- Pattern: "be explicit about what's safe to retry"

### Example usage in step

```typescript
@SagaStep()
private async createRoles(id: string, input: Input): Promise<void> {
  let result: IAM.CreateRolesResult;

  try {
    result = await this.broker.call<IAM.CreateRolesResult>(
      "iam.createRoles",
      { domain: `store:${id}` },
    );
  } catch (error) {
    // Network error → retryable
    throw new RetryableError("IAM service unavailable", error);
  }

  if (!result.success) {
    // Business error → fatal, immediate compensation
    throw new FatalError(result.error, undefined, "ROLE_CREATE_FAILED");
  }
}

async compensateCreateRoles(id: string): Promise<void> {
  await this.broker.call("iam.deleteRoles", { domain: `store:${id}` });
}
```

### Compensation retry policy

Compensations always use aggressive retry (10 attempts, exponential backoff) because:
1. Compensations MUST succeed to maintain consistency
2. If original step succeeded, compensation should eventually succeed
3. Failed compensation leaves system in inconsistent state


## Roadmap / Future Enhancements

### Phase 2: Advanced Features
- [ ] Parallel step execution (`@SagaParallel`)
- [ ] Conditional steps (`@SagaWhen`)
- [ ] Circuit breaker integration
- [ ] Dead letter queue для failed compensations

### Phase 3: Observability
- [ ] Saga state persistence и визуализация
- [ ] Metrics (step duration, failure rate)
- [ ] Distributed tracing integration

### Phase 4: Advanced Patterns
- [ ] Choreography mode (event-driven)
- [ ] Nested sagas
- [ ] Long-running sagas with checkpoints
