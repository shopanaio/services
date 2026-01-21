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
   * DBOS handles retry automatically - throw error to retry, return to stop.
   */
  retry?: RetryPolicy;
  /**
   * Step execution timeout in milliseconds.
   * If exceeded, step fails with StepTimeoutError (non-retryable).
   * Default: 30000 (30 seconds)
   */
  timeoutMs?: number;
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
 * Step timeout error - non-retryable.
 * Thrown when step execution exceeds configured timeoutMs.
 */
export class StepTimeoutError extends FatalError {
  constructor(stepName: string, timeoutMs: number) {
    super(`Step "${stepName}" timed out after ${timeoutMs}ms`);
    this.name = "StepTimeoutError";
    this.code = "STEP_TIMEOUT";
  }
}

// ─────────────────────────────────────────────────────────────────
// Timeout Helper
// ─────────────────────────────────────────────────────────────────

/** Default step execution timeout */
export const DEFAULT_STEP_TIMEOUT_MS = 30_000; // 30 seconds

/**
 * Wraps a promise with timeout.
 * Throws StepTimeoutError if timeout exceeded.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  stepName: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new StepTimeoutError(stepName, timeoutMs));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
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
  StepTimeoutError,
  isRetryableError,
  withTimeout,
  DEFAULT_STEP_TIMEOUT_MS,
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
 * 1. Выполняет метод с timeout
 * 2. DBOS handles retry automatically (throw = retry, return = stop)
 * 3. Записывает { method, args, config } в контекст
 * 4. При ошибке в саге — вызывается compensate{MethodName}(...args)
 *
 * Configuration options:
 * - name: Step name for logging (default: method name)
 * - critical: If false, error doesn't stop saga (default: true)
 * - compensate: Override compensation method name
 * - retry: Retry policy for transient errors (DBOS handles automatically)
 * - timeoutMs: Step execution timeout (default: 30000ms)
 *
 * Error handling pattern (like EventDispatchWorkflow):
 * - return result → success, no retry
 * - throw FatalError → fail immediately, trigger compensation
 * - throw RetryableError → DBOS retries according to policy
 * - throw StepTimeoutError → fail immediately (timeout is non-retryable)
 *
 * @example
 * @SagaStep({ critical: true })
 * private async createStore(id: string, input: Input): Promise<void> {
 *   await this.kernel.repository.store.create({ id, ...input });
 * }
 *
 * @SagaStep({
 *   retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
 *   timeoutMs: 10_000,
 * })
 * private async createRoles(id: string, input: Input): Promise<void> {
 *   const resp = await this.broker.call("iam.createRoles", { domain: `store:${id}` });
 *   if (!resp.ok) {
 *     if (!resp.error.retryable) throw new FatalError(resp.error.message);
 *     throw new RetryableError(resp.error.message); // DBOS will retry
 *   }
 * }
 */
export function SagaStep(config: SagaStepConfig = {}): MethodDecorator {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value as Function;
    const methodName = propertyKey as string;
    const stepName = config.name ?? methodName;
    const compensateMethod = config.compensate ?? `compensate${capitalize(methodName)}`;
    const timeoutMs = config.timeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;
    const isCritical = config.critical !== false; // default: true

    // Store metadata for BrokerSaga to collect
    const existingSteps: SagaStepMetadata[] = Reflect.getMetadata(SAGA_STEP_KEY, target) || [];
    const metadata: SagaStepMetadata = {
      stepConfig: { ...config, name: stepName },
      compensateMethod,
      methodName,
    };
    Reflect.defineMetadata(SAGA_STEP_KEY, [...existingSteps, metadata], target);

    // Retry policy for DBOS (default: no retry)
    const retryPolicy = config.retry ?? { maxAttempts: 1, intervalSeconds: 0, backoffRate: 1 };

    (descriptor as any).value = async function(...args: unknown[]) {
      const ctx = getSagaContext();

      // Result type for DBOS step - allows control over retry
      type StepResult<T> =
        | { kind: "ok"; data: T }
        | { kind: "nonRetryableFailure"; error: Error }
        | { kind: "timeout"; error: StepTimeoutError };

      let stepResult: StepResult<unknown>;

      try {
        stepResult = await DBOS.runStep<StepResult<unknown>>(
          async () => {
            ctx.recordAttempt(methodName);

            try {
              // Execute with timeout
              const result = await withTimeout(
                originalMethod.apply(this, args),
                timeoutMs,
                stepName,
              );

              return { kind: "ok", data: result };
            } catch (error) {
              // Timeout is non-retryable
              if (error instanceof StepTimeoutError) {
                return { kind: "timeout", error };
              }

              // FatalError or unknown → non-retryable
              if (!isRetryableError(error)) {
                return { kind: "nonRetryableFailure", error: error as Error };
              }

              // RetryableError → throw so DBOS retries
              throw error;
            }
          },
          {
            name: `step:${stepName}:${ctx.sagaId}`,
            retriesAllowed: retryPolicy.maxAttempts > 1,
            maxAttempts: retryPolicy.maxAttempts,
            intervalSeconds: retryPolicy.intervalSeconds,
            backoffRate: retryPolicy.backoffRate,
          },
        );
      } catch (error) {
        // All retries exhausted (RetryableError)
        const lastError = error as Error;
        logger.warn(`Step ${stepName} failed after retries exhausted`);

        if (!isCritical) {
          logger.warn(`Non-critical step ${stepName} failed, continuing saga`);
          ctx.recordWarning(stepName, lastError.message);
          return undefined;
        }

        throw new StepExecutionError(stepName, methodName, lastError);
      }

      // Handle non-retryable failures
      if (stepResult.kind === "timeout" || stepResult.kind === "nonRetryableFailure") {
        const failureError = stepResult.error;
        logger.debug(`Step ${stepName} failed with non-retryable error`);

        if (!isCritical) {
          logger.warn(`Non-critical step ${stepName} failed, continuing saga`);
          ctx.recordWarning(stepName, failureError.message);
          return undefined;
        }

        throw new StepExecutionError(stepName, methodName, failureError);
      }

      // Success - record step for compensation
      ctx.recordStep(methodName, stepName, args, { ...config, name: stepName });
      return stepResult.data;
    };

    return descriptor;
  };
}

/**
 * @Saga("name", config?) — маркирует метод run() как точку входа саги.
 *
 * При ошибке автоматически запускает компенсации в обратном порядке.
 * Компенсация вызывается с теми же аргументами что и оригинальный шаг.
 *
 * Compensation behavior:
 * - Only successfully executed steps (recorded in executedSteps) are compensated
 * - Non-critical steps that fail are not recorded, so won't be compensated
 * - Non-critical steps that succeed ARE recorded and WILL be compensated if saga fails later
 * - Use `compensate: false` to explicitly disable compensation for a step
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
 *
 * Uses DBOS.runStep with retry (same pattern as @SagaStep):
 * 1. Durability — survives process crashes
 * 2. Idempotency — replay skips already-completed compensations
 * 3. Exactly-once — DBOS guarantees no duplicate side effects on replay
 * 4. Correct metrics — recordCompAttempt inside callback, only counts real executions
 */
async function executeCompensationWithRetry(
  instance: any,
  step: ExecutedStep,
  methodName: string,
  ctx: SagaExecutionContext,
  policy: RetryPolicy,
): Promise<void> {
  // Use DBOS retry instead of custom loop (consistent with @SagaStep pattern)
  // throw = retry, return = success
  await DBOS.runStep(
    async () => {
      // IMPORTANT: Inside callback so it only counts real executions, not replays
      ctx.recordCompAttempt(step.method);

      await instance[methodName](...step.args);
    },
    {
      name: `compensate:${step.method}`,
      retriesAllowed: true,
      maxAttempts: policy.maxAttempts,
      intervalSeconds: policy.intervalSeconds,
      backoffRate: policy.backoffRate,
    },
  );
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
    timeoutMs: 10_000, // 10 second timeout
  })
  private async createRoles(id: string, input: StoreCreateInput): Promise<void> {
    // Pattern: return = success/fatal, throw RetryableError = DBOS retries
    const result = await this.broker.call<IAM.CreateRolesResult>(
      "iam.createRoles",
      { domain: `store:${id}` },
    );

    if (result.ok) return; // Success

    if (!result.error.retryable) {
      // Business error → fatal, no retry, immediate compensation
      throw new FatalError(result.error.message || "Failed to create roles");
    }

    // Transient error → throw so DBOS retries automatically
    throw new RetryableError(result.error.message, result.error);
  }

  @SagaStep({
    critical: false, // Continue even if media service is down
    // Has compensation! If succeeds and saga fails later → will be compensated
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
  // Only called for SUCCESSFULLY EXECUTED steps (recorded in executedSteps)
  // Override via config.compensate: "customMethodName" or false to disable
  // ═══════════════════════════════════════════════════════════════

  async compensateCreateStore(id: string): Promise<void> {
    await this.kernel.repository.store.delete(id);
    this.logger.info({ storeId: id }, "Compensated: deleted store");
  }

  async compensateCreateRoles(id: string): Promise<void> {
    await this.broker.call("iam.deleteRoles", { domain: `store:${id}` });
    this.logger.info({ storeId: id }, "Compensated: deleted roles");
  }

  // Non-critical step compensation - called if step succeeded but saga failed later
  async compensateCreateMediaAssetGroup(id: string): Promise<void> {
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
  StepTimeoutError,
  isRetryableError,
  toErrorInfo,
  withTimeout,
  DEFAULT_STEP_TIMEOUT_MS,
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
| `retry` | `RetryPolicy` | `{ maxAttempts: 1 }` | Retry policy for transient errors (DBOS handles automatically) |
| `timeoutMs` | `number` | `30000` | Step execution timeout in milliseconds |

### Поведение опций

#### `name`
Используется для:
- Логирования (`Step ${name} failed...`)
- Идентификации в `SagaResult.failedStep`
- Ключ в `SagaResult.attempts`
- DBOS step name (`step:${name}:${sagaId}`)

```typescript
@SagaStep({ name: "createStoreRecord" })  // Явное имя
private async createStore(...) { }

@SagaStep()  // Имя = "createStore" (из имени метода)
private async createStore(...) { }
```

#### `critical`
Определяет **только** поведение при ошибке шага (останавливает ли сагу).
Участие в компенсации определяется отдельно через `compensate` опцию.

| critical | При ошибке | Шаг записан | Результат саги |
|----------|------------|-------------|----------------|
| `true` (default) | Saga stops, compensation triggered | Нет (не успешен) | `success: false` |
| `false` | Warning logged, saga continues | Нет (не успешен) | `success: true` + warning |

**Важно про компенсацию:**
- Компенсируются только **успешно выполненные** шаги (записанные в `executedSteps`)
- Если non-critical шаг **успешен** → записан → будет компенсирован если сага упадёт позже
- Если non-critical шаг **упал** → НЕ записан → компенсации не будет
- `compensate: false` явно отключает компенсацию даже для успешных шагов

```typescript
// Critical step - ошибка останавливает сагу
@SagaStep({ critical: true })
private async createStore(...) { }

// Non-critical - сага продолжится, ошибка в warnings
// Если успешен и сага упадёт позже - будет компенсирован!
@SagaStep({ critical: false })
private async createMediaAssets(...) { }

// Non-critical + no compensation (fire-and-forget)
@SagaStep({ critical: false, compensate: false })
private async sendWelcomeEmail(...) { }
```

Non-critical шаги полезны для:
- Уведомлений (email, push) — обычно с `compensate: false`
- Аналитики/метрик — обычно с `compensate: false`
- Вторичных сервисов (media, cache) — могут иметь компенсацию

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
DBOS handles retry automatically. Pattern (like EventDispatchWorkflow):
- `return result` → success, no retry
- `throw FatalError` → fail immediately, trigger compensation
- `throw RetryableError` → DBOS retries according to policy

```
┌─────────────────────────────────────────────────────────────────┐
│ @SagaStep({ retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 } })
│
│ Attempt 1 ──▶ throw RetryableError ──▶ DBOS waits 1s
│ Attempt 2 ──▶ throw RetryableError ──▶ DBOS waits 2s
│ Attempt 3 ──▶ throw RetryableError ──▶ FAIL → compensation
│
│ Attempt 1 ──▶ return { kind: "nonRetryableFailure" } ──▶ FAIL → compensation (no retry!)
│ Attempt 1 ──▶ return { kind: "ok" } ──▶ continue
└─────────────────────────────────────────────────────────────────┘
```

#### `timeoutMs`
Step execution timeout. If exceeded, step fails with `StepTimeoutError` (non-retryable).

```typescript
@SagaStep({
  timeoutMs: 10_000,  // 10 seconds
  retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
})
private async callExternalService(): Promise<void> {
  // If this takes > 10s, StepTimeoutError is thrown (no retry)
  await this.broker.call("external.slowOperation", {});
}
```

### RetryPolicy

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxAttempts` | `number` | 1 | Maximum number of execution attempts |
| `intervalSeconds` | `number` | 0 | Initial interval between retries |
| `backoffRate` | `number` | 1 | Multiplier for interval on each retry |

Example: `{ maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 }` → DBOS retries at ~1s, ~2s, ~4s

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
// Step with retry policy and timeout (pattern from EventDispatchWorkflow)
@SagaStep({
  retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
  timeoutMs: 10_000, // 10 second timeout
})
private async createRoles(id: string, input: Input): Promise<void> {
  // DBOS handles retry: throw = retry, return = stop
  const result = await this.broker.call<IAM.CreateRolesResult>(
    "iam.createRoles",
    { domain: `store:${id}` },
  );

  if (result.ok) return; // Success - no retry

  if (!result.error.retryable) {
    // Business error → fatal, immediate compensation (no retry)
    throw new FatalError(result.error.message, undefined, "ROLE_CREATE_FAILED");
  }

  // Transient error → throw so DBOS retries automatically
  throw new RetryableError(result.error.message);
}

async compensateCreateRoles(id: string): Promise<void> {
  await this.broker.call("iam.deleteRoles", { domain: `store:${id}` });
}

// Non-critical step - continues saga on failure
@SagaStep({ critical: false, timeoutMs: 5_000 })
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
