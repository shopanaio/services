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
│  │   { method: "generateId", args: [] },                         │   │
│  │   { method: "createStore", args: ["abc123", input] },         │   │
│  │   { method: "createRoles", args: ["abc123", input] },         │   │
│  │ ]                                                             │   │
│  │                                                               │   │
│  │ Note: result не хранится — данные передаются через args       │   │
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

/** Retry policy (aligned with ActionMetadata from broker) */
export interface RetryPolicy {
  maxAttempts: number;
  intervalSeconds: number;
  backoffRate: number;
}

/** Конфигурация шага саги */
export interface SagaStepConfig {
  /** Имя шага для логирования и идентификации (опционально, default = method name) */
  name?: string;
  /** Критичность шага - если false, ошибка не останавливает сагу */
  critical?: boolean;
  /**
   * Compensation method name or false to disable.
   * - undefined/string: compensate + PascalCase(methodName) or custom name
   * - false: no compensation (fire-and-forget, useful for notifications/analytics)
   */
  compensate?: string | false;
  /**
   * Retry policy for transient errors.
   * Fatal errors skip retry and trigger immediate compensation.
   */
  retry?: RetryPolicy;
}

/** Метаданные шага с компенсацией */
export interface SagaStepMetadata {
  stepConfig: SagaStepConfig;
  /** Resolved compensation method name */
  compensateMethod: string;
  /** Имя метода */
  methodName: string;
}

/** Compensation exhaustion handler (for DLQ/alerting extension point) */
export type OnCompensationExhausted = (
  stepName: string,
  methodName: string,
  error: Error,
  context: {
    sagaId: string;
    args: unknown[];
    /** Number of compensation attempts (not step execution attempts) */
    compAttempts: number;
  },
) => void | Promise<void>;

/** Saga executor configuration */
export interface SagaExecutorConfig {
  /**
   * Called when compensation retries are exhausted.
   * Use for DLQ, alerting, manual intervention flags.
   * Default: logs error.
   */
  onCompensationExhausted?: OnCompensationExhausted;
  /**
   * Compensation retry policy override.
   * Default: { maxAttempts: 10, intervalSeconds: 1, backoffRate: 2 }
   */
  compensationRetryPolicy?: RetryPolicy;
}

/** Default compensation retry policy */
export const DEFAULT_COMPENSATION_RETRY: RetryPolicy = {
  maxAttempts: 10,
  intervalSeconds: 1,
  backoffRate: 2,
};

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
 * Step execution error wrapper.
 * Preserves step context for observability (failedStep tracking).
 *
 * NOT a SagaError — doesn't participate in retry classification.
 * Classification is done on `cause` if needed.
 */
export class StepExecutionError extends Error {
  constructor(
    public readonly stepName: string,
    public readonly methodName: string,
    public readonly cause: Error,
  ) {
    super(`Step "${stepName}" failed: ${cause.message}`, { cause });
    this.name = "StepExecutionError";
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
  /** Canonical identifier (method name) */
  method: string;
  /** Display name (config.name or method) — for logs/UI */
  stepName: string;
  /** Аргументы с которыми был вызван шаг (передаются в компенсацию) */
  args: unknown[];
  /** Step config for compensation method lookup */
  config: SagaStepConfig;
}

/** Результат выполнения саги (fully serializable) */
export interface SagaResult<TOutput = unknown> {
  success: boolean;
  status: SagaStatus;
  data?: TOutput;
  /** Error info (serializable) */
  error?: ErrorInfo;
  /** Шаг, на котором произошла ошибка */
  failedStep?: string;
  /** Attempt count per step execution (for metrics/debugging) */
  attempts: Record<string, number>;
  /** Attempt count per compensation (for metrics/debugging) */
  compAttempts: Record<string, number>;
  /** Steps that succeeded */
  succeededSteps: string[];
  /** Steps that were successfully compensated */
  compensatedSteps: string[];
  /** Whether all compensations succeeded */
  compensated: boolean;
  /** Compensation errors (serializable) */
  compensationErrors: ErrorInfo[];
  /** Warnings от non-critical шагов */
  warnings: Array<{ step: string; message: string }>;
}
```

### 2. SagaExecutionContext

**Файл:** `packages/shared-kernel/src/saga/SagaExecutionContext.ts`

```typescript
import { AsyncLocalStorage } from "node:async_hooks";
import { SagaStepConfig, ExecutedStep } from "./types.js";

// Note: ExecutedStep imported from types.ts (single source of truth)

/**
 * Контекст выполнения саги.
 * Хранит стек выполненных шагов для компенсации.
 *
 * Note: Не хранит результаты шагов — в v1 архитектуре данные
 * передаются между шагами через переменные/аргументы.
 */
export class SagaExecutionContext {
  readonly sagaId: string;
  private executedSteps: ExecutedStep[] = [];
  private compensatedSteps: string[] = [];
  private attempts: Record<string, number> = {};
  private compAttempts: Record<string, number> = {};
  private warnings: Array<{ step: string; message: string }> = [];
  private failedStep?: string;

  constructor(sagaId: string) {
    this.sagaId = sagaId;
  }

  // ═══════════════════════════════════════════════════════════════
  // Step execution tracking
  // ═══════════════════════════════════════════════════════════════

  /** Record step attempt (called before each execution, including retries) */
  recordAttempt(method: string): number {
    this.attempts[method] = (this.attempts[method] ?? 0) + 1;
    return this.attempts[method];
  }

  /** Get all step execution attempts */
  getAttempts(): Record<string, number> {
    return { ...this.attempts };
  }

  // ═══════════════════════════════════════════════════════════════
  // Compensation tracking
  // ═══════════════════════════════════════════════════════════════

  /** Record compensation attempt */
  recordCompAttempt(method: string): number {
    this.compAttempts[method] = (this.compAttempts[method] ?? 0) + 1;
    return this.compAttempts[method];
  }

  /** Get compensation attempt count for step */
  getCompAttemptCount(method: string): number {
    return this.compAttempts[method] ?? 0;
  }

  /** Get all compensation attempts */
  getCompAttempts(): Record<string, number> {
    return { ...this.compAttempts };
  }

  /** Записать успешно выполненный шаг */
  recordStep(method: string, stepName: string, args: unknown[], config: SagaStepConfig): void {
    this.executedSteps.push({ method, stepName, args, config });
  }

  /** Записать ошибку шага */
  recordFailure(method: string): void {
    this.failedStep = method;
  }

  /** Записать warning от non-critical шага */
  recordWarning(step: string, message: string): void {
    this.warnings.push({ step, message });
  }

  /** Получить warnings */
  getWarnings(): Array<{ step: string; message: string }> {
    return [...this.warnings];
  }

  /** Получить failed step */
  getFailedStep(): string | undefined {
    return this.failedStep;
  }

  /** Получить шаги для компенсации (в обратном порядке) */
  getStepsToCompensate(): ExecutedStep[] {
    return [...this.executedSteps].reverse();
  }

  /** Получить успешные шаги */
  getSucceededSteps(): string[] {
    return this.executedSteps.map((s) => s.method);
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
import {
  SagaStepConfig,
  SagaStepMetadata,
  SagaExecutorConfig,
  RetryPolicy,
  StepExecutionError,
  isRetryableError,
  addJitter,
  DEFAULT_COMPENSATION_RETRY,
} from "./types.js";

export const SAGA_DEFINITION_KEY = Symbol("saga:definition");
export const SAGA_STEP_KEY = Symbol("saga:step");

const logger = new Logger("SagaEngine");

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * @SagaStep() — маркирует метод как durable шаг саги.
 *
 * При вызове:
 * 1. Выполняет метод (с retry при transient errors)
 * 2. Записывает { method, args, result, config } в контекст
 * 3. При ошибке в саге — вызывается compensate{MethodName}(...args)
 *
 * Configuration options:
 * - name: Step name for logging (default: method name)
 * - critical: If false, error doesn't stop saga (default: true)
 * - compensate: Override compensation method name
 * - retry: Retry policy for transient errors
 *
 * @example
 * @SagaStep({ critical: true })
 * private async createStore(id: string, input: Input): Promise<void> {
 *   await this.kernel.repository.store.create({ id, ...input });
 * }
 *
 * @SagaStep({
 *   retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
 * })
 * private async createRoles(id: string, input: Input): Promise<void> {
 *   await this.broker.call("iam.createRoles", { domain: `store:${id}` });
 * }
 *
 * // Compensation receives same args
 * async compensateCreateStore(id: string): Promise<void> {
 *   await this.kernel.repository.store.delete(id);
 * }
 */
export function SagaStep(config: SagaStepConfig = {}): MethodDecorator {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value as Function;
    const methodName = propertyKey as string;
    const stepName = config.name ?? methodName;
    const compensateMethod = config.compensate ?? `compensate${capitalize(methodName)}`;

    // Store metadata for BrokerSaga to collect
    const existingSteps: SagaStepMetadata[] = Reflect.getMetadata(SAGA_STEP_KEY, target) || [];
    const metadata: SagaStepMetadata = {
      stepConfig: { ...config, name: stepName },
      compensateMethod,
      methodName,
    };
    Reflect.defineMetadata(SAGA_STEP_KEY, [...existingSteps, metadata], target);

    (descriptor as any).value = async function(...args: unknown[]) {
      const ctx = getSagaContext();
      const policy = config.retry ?? { maxAttempts: 1, intervalSeconds: 0, backoffRate: 1 };
      const isCritical = config.critical !== false; // default: true

      let lastError: Error | undefined;
      let interval = policy.intervalSeconds * 1000;

      for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
        ctx.recordAttempt(methodName);

        try {
          // Выполняем шаг
          const result = await originalMethod.apply(this, args);

          // Записываем успешный шаг (args для компенсации, result не храним)
          ctx.recordStep(methodName, stepName, args, { ...config, name: stepName });

          return result;
        } catch (error) {
          lastError = error as Error;

          // FatalError or unknown → no retry
          if (!isRetryableError(error)) {
            logger.debug(`Step ${stepName} failed with non-retryable error, no retry`);

            // Non-critical step: log warning, don't throw
            if (!isCritical) {
              logger.warn(`Non-critical step ${stepName} failed, continuing saga`, error);
              ctx.recordWarning(stepName, lastError.message);
              return undefined; // Saga continues
            }

            // Wrap in StepExecutionError for observability
            throw new StepExecutionError(stepName, methodName, lastError);
          }

          // Last attempt
          if (attempt === policy.maxAttempts) {
            logger.warn(`Step ${stepName} failed after ${attempt} attempts`);

            // Non-critical step: log warning, don't throw
            if (!isCritical) {
              logger.warn(`Non-critical step ${stepName} exhausted retries, continuing saga`);
              ctx.recordWarning(stepName, lastError.message);
              return undefined; // Saga continues
            }

            // Wrap in StepExecutionError for observability
            throw new StepExecutionError(stepName, methodName, lastError);
          }

          // Wait before retry with deterministic jitter
          const jitterSeed = `${ctx.sagaId}:${stepName}:${attempt}`;
          const jitteredInterval = addJitter(interval, jitterSeed);
          logger.debug(`Step ${stepName} attempt ${attempt} failed, retrying in ${jitteredInterval}ms`);

          // DBOS.sleep() is durable - recorded for deterministic replay
          await DBOS.sleep(jitteredInterval);
          interval *= policy.backoffRate;
        }
      }

      throw lastError;
    };

    // DBOS.step for durability - NO RETRIES here (handled above)
    return DBOS.step({
      retriesAllowed: false,
      maxAttempts: 1,
    })(target, propertyKey as string, descriptor);
  };
}

/**
 * @Saga("name", config?) — маркирует метод run() как точку входа саги.
 *
 * При ошибке автоматически запускает компенсации в обратном порядке.
 * Компенсация вызывается с теми же аргументами что и оригинальный шаг.
 *
 * Non-critical steps (critical: false) log warnings but don't trigger compensation.
 *
 * @param name - Unique saga name for registration
 * @param config - Optional executor configuration (DLQ hook, retry policy override)
 *
 * @example
 * @Saga("storeCreate")
 * async run(input: Input): Promise<Output> { ... }
 *
 * @example
 * @Saga("storeCreate", {
 *   onCompensationExhausted: async (step, method, error, ctx) => {
 *     await this.broker.call("events.addToDLQ", { ... });
 *   },
 *   compensationRetryPolicy: { maxAttempts: 20, intervalSeconds: 2, backoffRate: 1.5 },
 * })
 * async run(input: Input): Promise<Output> { ... }
 */
export function Saga(name: string, config?: SagaExecutorConfig): MethodDecorator {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value as Function;

    // Store metadata for registration
    Reflect.defineMetadata(SAGA_DEFINITION_KEY, { name }, target.constructor);

    (descriptor as any).value = async function(input: unknown): Promise<SagaResult> {
      const sagaId = DBOS.workflowID;
      const ctx = new SagaExecutionContext(sagaId);
      const compensationErrors: Error[] = [];

      // Resolve config with defaults
      const compensationRetryPolicy = config?.compensationRetryPolicy ?? DEFAULT_COMPENSATION_RETRY;
      const onCompensationExhausted = config?.onCompensationExhausted ?? ((step, method, err, context) => {
        logger.error(
          { sagaId: context.sagaId, step, method, error: err.message, compAttempts: context.compAttempts },
          "Compensation exhausted - manual intervention required",
        );
      });

      try {
        // Execute saga within AsyncLocalStorage context
        const result = await sagaContextStorage.run(ctx, async () => {
          return originalMethod.call(this, input);
        });

        return {
          success: true,
          status: "completed" as SagaStatus,
          data: result,
          attempts: ctx.getAttempts(),
          compAttempts: {},
          succeededSteps: ctx.getSucceededSteps(),
          compensatedSteps: [],
          compensated: false,
          compensationErrors: [],
          warnings: ctx.getWarnings(),
        };

      } catch (error) {
        // Extract step info from StepExecutionError
        // methodName = canonical key, stepName = display name
        const stepError = error instanceof StepExecutionError ? error : null;
        const failedMethod = stepError?.methodName ?? "unknown";
        const failedStepName = stepError?.stepName ?? "unknown";
        ctx.recordFailure(failedMethod);

        logger.error(`Saga ${name} failed at step ${failedStepName}, starting compensation`, error);

        // ═══════════════════════════════════════════════════════
        // COMPENSATION PHASE (with retry)
        // ═══════════════════════════════════════════════════════
        const stepsToCompensate = ctx.getStepsToCompensate();

        for (const step of stepsToCompensate) {
          // Skip if compensation explicitly disabled
          if (step.config.compensate === false) {
            logger.debug(`Compensation disabled for step: ${step.method}, skipping`);
            continue;
          }

          const compensateMethod = typeof step.config.compensate === "string"
            ? step.config.compensate
            : `compensate${capitalize(step.method)}`;

          // Check if compensation method exists
          if (typeof (this as any)[compensateMethod] !== "function") {
            logger.debug(`No compensation method "${compensateMethod}" for step: ${step.method}, skipping`);
            continue;
          }

          try {
            // Run compensation with retry policy (configurable)
            await executeCompensationWithRetry(
              this,
              step,
              compensateMethod,
              ctx,
              compensationRetryPolicy,
            );
            ctx.markCompensated(step.method);
            logger.debug(`Compensated: ${step.method}`);
          } catch (compError) {
            // Compensation exhausted - call extension hook
            await onCompensationExhausted(step.method, compensateMethod, compError as Error, {
              sagaId: ctx.sagaId,
              args: step.args,
              compAttempts: ctx.getCompAttemptCount(step.method),
            });
            compensationErrors.push(compError as Error);
          }
        }

        const status: SagaStatus = compensationErrors.length > 0 ? "failed" : "compensated";

        // Extract original error from StepExecutionError wrapper
        const originalError = stepError?.cause ?? error as Error;

        return {
          success: false,
          status,
          error: toErrorInfo(originalError),
          failedStep: ctx.getFailedStep(),
          attempts: ctx.getAttempts(),
          compAttempts: ctx.getCompAttempts(),
          succeededSteps: ctx.getSucceededSteps(),
          compensatedSteps: ctx.getCompensatedSteps(),
          compensated: compensationErrors.length === 0,
          compensationErrors: compensationErrors.map(toErrorInfo),
          warnings: ctx.getWarnings(),
        };
      }
    };

    // DBOS.workflow for durability
    return DBOS.workflow()(target, propertyKey as string, descriptor);
  };
}

/**
 * Execute compensation with aggressive retry.
 * Compensations MUST succeed - they get more attempts and always retry.
 */
async function executeCompensationWithRetry(
  instance: any,
  step: ExecutedStep,
  methodName: string,
  ctx: SagaExecutionContext,
  policy: RetryPolicy,
): Promise<void> {
  let lastError: Error | undefined;
  let interval = policy.intervalSeconds * 1000;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    // Track compensation attempts separately from step execution attempts
    ctx.recordCompAttempt(step.method);

    try {
      await instance[methodName](...step.args);
      return;
    } catch (error) {
      lastError = error as Error;

      if (attempt === policy.maxAttempts) {
        logger.error(`Compensation ${methodName} failed after ${attempt} attempts`);
        throw error;
      }

      // Jitter seed is deterministic
      const jitterSeed = `${ctx.sagaId}:comp:${step.method}:${attempt}`;
      const jitteredInterval = addJitter(interval, jitterSeed);
      logger.warn(`Compensation ${methodName} attempt ${attempt} failed, retrying in ${jitteredInterval}ms`);

      // DBOS.sleep() is durable
      await DBOS.sleep(jitteredInterval);
      interval *= policy.backoffRate;
    }
  }

  throw lastError;
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
    await this.createMediaAssetGroup(storeId); // non-critical, won't stop saga
    return { storeId, organizationId: input.organizationId };
  }

  // ═══════════════════════════════════════════════════════════════
  // STEPS — durable, автоматически трекаются
  // Config options: name, critical, compensate, retry
  // ═══════════════════════════════════════════════════════════════

  @SagaStep()
  private async generateId(): Promise<string> {
    return uuidv7();
  }
  // No compensateGenerateId — pure function, no side effects

  @SagaStep({ critical: true })
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

  @SagaStep({
    retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
  })
  private async createRoles(id: string, input: StoreCreateInput): Promise<void> {
    let result: IAM.CreateRolesResult;

    try {
      result = await this.broker.call<IAM.CreateRolesResult>(
        "iam.createRoles",
        { domain: `store:${id}` },
      );
    } catch (error) {
      // Network error → retryable
      throw new RetryableError("IAM service unavailable", error as Error);
    }

    if (!result.success) {
      // Business error → fatal, no retry
      throw new FatalError(result.error || "Failed to create roles");
    }
  }

  @SagaStep({
    critical: false, // Continue even if media service is down
  })
  private async createMediaAssetGroup(id: string): Promise<void> {
    await this.broker.call("media.createAssetGroup", {
      ownerType: "store",
      ownerId: id,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPENSATIONS — convention: compensate{PascalCase(methodName)}
  // Called with the SAME arguments as the original step
  // Override via config.compensate: "customMethodName"
  // ═══════════════════════════════════════════════════════════════

  async compensateCreateStore(id: string): Promise<void> {
    await this.kernel.repository.store.delete(id);
    this.logger.info({ storeId: id }, "Compensated: deleted store");
  }

  async compensateCreateRoles(id: string): Promise<void> {
    await this.broker.call("iam.deleteRoles", { domain: `store:${id}` });
    this.logger.info({ storeId: id }, "Compensated: deleted roles");
  }

  async compensateCreateMediaAssetGroup(id: string): Promise<void> {
    // Non-critical step, but we still try to clean up
    try {
      await this.broker.call("media.deleteAssetGroup", {
        ownerType: "store",
        ownerId: id,
      });
      this.logger.info({ storeId: id }, "Compensated: deleted media asset group");
    } catch (error) {
      // Non-critical, just log
      this.logger.warn({ storeId: id, error }, "Failed to compensate media asset group");
    }
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
export { Saga, SagaStep, SAGA_STEP_KEY, SAGA_DEFINITION_KEY } from "./decorators.js";

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
  SagaResult,
  SagaStatus,
  StepResult,
  RetryPolicy,
  ErrorInfo,
  ExecutedStep,
  SagaStepConfig,
  SagaStepMetadata,
  SagaExecutorConfig,
  OnCompensationExhausted,
} from "./types.js";

// Constants
export { DEFAULT_COMPENSATION_RETRY } from "./types.js";

// Errors
export {
  SagaError,
  RetryableError,
  FatalError,
  StepExecutionError,
  isRetryableError,
  toErrorInfo,
  addJitter,
} from "./types.js";
```

## SagaExecutorConfig Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onCompensationExhausted` | `OnCompensationExhausted` | logs error | Called when compensation retries exhausted (DLQ hook) |
| `compensationRetryPolicy` | `RetryPolicy` | `{ maxAttempts: 10, ... }` | Override compensation retry policy |

```typescript
@Saga("storeCreate", {
  onCompensationExhausted: async (step, method, error, ctx) => { /* DLQ */ },
  compensationRetryPolicy: { maxAttempts: 20, intervalSeconds: 2, backoffRate: 1.5 },
})
```

## SagaStepConfig Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | method name | Step name for logging and identification |
| `critical` | `boolean` | `true` | If `false`, error doesn't stop saga (logged as warning) |
| `compensate` | `string \| false` | `compensate{MethodName}` | Compensation method name, or `false` to disable |
| `retry` | `RetryPolicy` | `{ maxAttempts: 1 }` | Retry policy for transient errors |

### Поведение опций

#### `name`
Используется для:
- Логирования (`Step ${name} failed...`)
- Идентификации в `SagaResult.failedStep`
- Ключ в `SagaResult.attempts`
- Seed для deterministic jitter (`${sagaId}:${name}:${attempt}`)

```typescript
@SagaStep({ name: "createStoreRecord" })  // Явное имя
private async createStore(...) { }

@SagaStep()  // Имя = "createStore" (из имени метода)
private async createStore(...) { }
```

#### `critical`
Определяет поведение при ошибке шага:

| critical | При ошибке | Компенсация | Результат саги |
|----------|------------|-------------|----------------|
| `true` (default) | Saga stops | Triggered | `success: false` |
| `false` | Warning logged, saga continues | Skipped | `success: true` + warning |

```typescript
// Critical step - ошибка останавливает сагу
@SagaStep({ critical: true })
private async createStore(...) { }

// Non-critical - сага продолжится, ошибка в warnings
@SagaStep({ critical: false })
private async sendWelcomeEmail(...) { }
```

Non-critical шаги полезны для:
- Уведомлений (email, push)
- Аналитики/метрик
- Кеширования
- Вторичных сервисов

#### `compensate`
Override имени метода компенсации или отключение:

```typescript
// Convention: compensateCreateStore
@SagaStep()
private async createStore(...) { }
async compensateCreateStore(...) { }

// Custom: rollbackStore
@SagaStep({ compensate: "rollbackStore" })
private async createStore(...) { }
async rollbackStore(...) { }

// Disable compensation (fire-and-forget)
// Useful for: notifications, analytics, audit logs
@SagaStep({ compensate: false })
private async sendWelcomeEmail(...) { }
// No compensation method needed
```

| compensate | При откате | Use case |
|------------|-----------|----------|
| undefined | `compensate{Method}()` | Default, требует метод компенсации |
| `"customName"` | `customName()` | Custom naming |
| `false` | Skip | Fire-and-forget (email, analytics, audit) |

#### `retry`
Retry policy применяется только к `RetryableError`:

```
┌─────────────────────────────────────────────────────────────────┐
│ @SagaStep({ retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 } })
│
│ Attempt 1 ──▶ RetryableError ──▶ sleep(1s + jitter)
│ Attempt 2 ──▶ RetryableError ──▶ sleep(2s + jitter)
│ Attempt 3 ──▶ RetryableError ──▶ FAIL → compensation
│
│ Attempt 1 ──▶ FatalError ──▶ FAIL → compensation (no retry!)
│ Attempt 1 ──▶ Success ──▶ continue
└─────────────────────────────────────────────────────────────────┘
```

Jitter добавляется детерминистично (±25%) для предотвращения thundering herd.

### RetryPolicy

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxAttempts` | `number` | 1 | Maximum number of execution attempts |
| `intervalSeconds` | `number` | 0 | Initial interval between retries |
| `backoffRate` | `number` | 1 | Multiplier for interval on each retry |

Example: `{ maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 }` → retries at ~1s, ~2s, ~4s (with jitter)

### Compensation Retry Policy

Компенсации всегда используют aggressive retry (не настраивается через step config):

```typescript
const DEFAULT_COMPENSATION_RETRY = {
  maxAttempts: 10,
  intervalSeconds: 1,
  backoffRate: 2,
};
```

Почему aggressive retry для компенсаций:
1. Компенсации **должны** успешно завершиться для консистентности
2. Если оригинальный шаг успешен, компенсация должна eventually succeed
3. Неуспешная компенсация оставляет систему в inconsistent state

### Extension Point: onCompensationExhausted

Когда все retry компенсации исчерпаны, вызывается `onCompensationExhausted` hook:

```typescript
@Saga("storeCreate", {
  // DLQ integration
  onCompensationExhausted: async (stepName, methodName, error, context) => {
    // Записать в Dead Letter Queue через существующий broker action
    await this.broker.call("events.addToDLQ", {
      eventId: `saga:${context.sagaId}:compensation:${stepName}`,
      eventType: "saga.compensation.failed",
      tenantId: this.tenantId,
      correlationId: context.sagaId,
      handler: {
        service: "saga",
        action: methodName,
      },
      payload: { args: context.args },
      error: error.message,
      errorCode: (error as any).code,
      attempts: context.attempts,
    });

    // Optional: alerting
    this.logger.error(
      { sagaId: context.sagaId, step: stepName, method: methodName },
      "Saga compensation exhausted - added to DLQ",
    );
  },

  // Optional: override retry policy for this saga
  compensationRetryPolicy: {
    maxAttempts: 15,      // More attempts for critical saga
    intervalSeconds: 2,
    backoffRate: 1.5,
  },
})
async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
  // ...
}
```

DLQ entries можно мониторить через `events.getDLQEntries` и очищать через `events.cleanupDLQ`.

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
// Step with retry policy for transient errors
@SagaStep({
  retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
})
private async createRoles(id: string, input: Input): Promise<void> {
  let result: IAM.CreateRolesResult;

  try {
    result = await this.broker.call<IAM.CreateRolesResult>(
      "iam.createRoles",
      { domain: `store:${id}` },
    );
  } catch (error) {
    // Network error → retryable (will retry up to 3 times)
    throw new RetryableError("IAM service unavailable", error);
  }

  if (!result.success) {
    // Business error → fatal, immediate compensation (no retry)
    throw new FatalError(result.error, undefined, "ROLE_CREATE_FAILED");
  }
}

async compensateCreateRoles(id: string): Promise<void> {
  await this.broker.call("iam.deleteRoles", { domain: `store:${id}` });
}

// Non-critical step - continues saga on failure
@SagaStep({ critical: false })
private async sendNotification(id: string): Promise<void> {
  await this.broker.call("notifications.send", { storeId: id });
}
// No compensation needed - step is non-critical
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
