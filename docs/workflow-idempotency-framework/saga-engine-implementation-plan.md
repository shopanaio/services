# Saga Engine - Подробный План Имплементации

> На основе дизайна из `saga-engine-design-v1.md`

## Содержание

1. [Обзор и зависимости](#1-обзор-и-зависимости)
2. [Шаг 1: Создание типов и интерфейсов](#шаг-1-создание-типов-и-интерфейсов)
3. [Шаг 2: SagaExecutionContext](#шаг-2-sagaexecutioncontext)
4. [Шаг 3: Декораторы @Saga и @SagaStep](#шаг-3-декораторы-saga-и-sagastep)
5. [Шаг 4: BrokerSaga базовый класс](#шаг-4-brokersaga-базовый-класс)
6. [Шаг 5: Интеграция с ServiceBroker](#шаг-5-интеграция-с-servicebroker)
7. [Шаг 6: Экспорты и index.ts](#шаг-6-экспорты-и-indexts)
8. [Шаг 7: Unit тесты](#шаг-7-unit-тесты)
9. [Шаг 8: Пример использования (StoreCreateSaga)](#шаг-8-пример-использования-storecreatesaga)
10. [Чек-лист завершения](#чек-лист-завершения)

---

## 1. Обзор и зависимости

### Структура файлов

```
packages/shared-kernel/src/saga/
├── index.ts                    # Public exports
├── types.ts                    # Типы, интерфейсы, ошибки
├── SagaExecutionContext.ts     # AsyncLocalStorage context
├── decorators.ts               # @Saga, @SagaStep
└── BrokerSaga.ts               # Базовый класс
```

### Зависимости

```json
{
  "@dbos-inc/dbos-sdk": "existing",
  "@nestjs/common": "existing",
  "reflect-metadata": "existing",
  "uuid": "existing"
}
```

### Существующие модули для интеграции

| Модуль | Путь | Назначение |
|--------|------|------------|
| `ServiceBroker` | `broker/ServiceBroker.ts` | Добавить метод `runSaga()` |
| `WorkflowRegistry` | `workflow/WorkflowRegistry.ts` | Регистрация саг |
| `index.ts` | `src/index.ts` | Экспорты |

---

## Шаг 1: Создание типов и интерфейсов

**Файл:** `packages/shared-kernel/src/saga/types.ts`

### 1.1 Создать файл

```bash
mkdir -p packages/shared-kernel/src/saga
touch packages/shared-kernel/src/saga/types.ts
```

### 1.2 Содержимое types.ts

```typescript
/**
 * @file Saga Engine Types
 * @description Типы, интерфейсы и классы ошибок для Saga Engine
 */

// ═══════════════════════════════════════════════════════════════════════════
// RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════

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

/** Результат выполнения шага (fully serializable) */
export interface StepResult<T = unknown> {
  success: boolean;
  data?: T;
  /** Serializable error info (not Error object) */
  error?: ErrorInfo;
}

/** Состояние выполнения саги */
export type SagaStatus =
  | "pending"
  | "running"
  | "completed"
  | "compensating"
  | "compensated"
  | "failed";

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

// ═══════════════════════════════════════════════════════════════════════════
// RETRY POLICY
// ═══════════════════════════════════════════════════════════════════════════

/** Retry policy (aligned with ActionMetadata from broker) */
export interface RetryPolicy {
  maxAttempts: number;
  intervalSeconds: number;
  backoffRate: number;
}

/** Default compensation retry policy */
export const DEFAULT_COMPENSATION_RETRY: RetryPolicy = {
  maxAttempts: 10,
  intervalSeconds: 1,
  backoffRate: 2,
};

// ═══════════════════════════════════════════════════════════════════════════
// STEP CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTOR CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CLASSIFICATION HELPER
// ═══════════════════════════════════════════════════════════════════════════

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
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMEOUT HELPER
// ═══════════════════════════════════════════════════════════════════════════

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
```

### 1.3 Чек-лист для types.ts

- [ ] Создать файл `packages/shared-kernel/src/saga/types.ts`
- [ ] Добавить `ErrorInfo` interface и `toErrorInfo()` helper
- [ ] Добавить `StepResult<T>` interface
- [ ] Добавить `SagaStatus` type
- [ ] Добавить `SagaResult<TOutput>` interface
- [ ] Добавить `RetryPolicy` interface и `DEFAULT_COMPENSATION_RETRY`
- [ ] Добавить `SagaStepConfig` interface
- [ ] Добавить `SagaStepMetadata` interface
- [ ] Добавить `ExecutedStep` interface
- [ ] Добавить `OnCompensationExhausted` type
- [ ] Добавить `SagaExecutorConfig` interface
- [ ] Добавить error classes: `SagaError`, `RetryableError`, `FatalError`, `StepExecutionError`, `StepTimeoutError`
- [ ] Добавить `isRetryableError()` helper
- [ ] Добавить `DEFAULT_STEP_TIMEOUT_MS` и `withTimeout()` helper

---

## Шаг 2: SagaExecutionContext

**Файл:** `packages/shared-kernel/src/saga/SagaExecutionContext.ts`

### 2.1 Содержимое SagaExecutionContext.ts

```typescript
/**
 * @file Saga Execution Context
 * @description AsyncLocalStorage-based context for tracking saga execution
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { SagaStepConfig, ExecutedStep } from "./types.js";

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

  // ═══════════════════════════════════════════════════════════════════════
  // Step execution tracking
  // ═══════════════════════════════════════════════════════════════════════

  /** Record step attempt (called before each execution, including retries) */
  recordAttempt(method: string): number {
    this.attempts[method] = (this.attempts[method] ?? 0) + 1;
    return this.attempts[method];
  }

  /** Get all step execution attempts */
  getAttempts(): Record<string, number> {
    return { ...this.attempts };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Compensation tracking
  // ═══════════════════════════════════════════════════════════════════════

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
  recordStep(
    method: string,
    stepName: string,
    args: unknown[],
    config: SagaStepConfig,
  ): void {
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

### 2.2 Чек-лист для SagaExecutionContext.ts

- [ ] Создать файл `packages/shared-kernel/src/saga/SagaExecutionContext.ts`
- [ ] Импортировать `AsyncLocalStorage` из `node:async_hooks`
- [ ] Импортировать типы из `./types.js`
- [ ] Создать класс `SagaExecutionContext` с:
  - [ ] `sagaId: string`
  - [ ] `executedSteps: ExecutedStep[]`
  - [ ] `compensatedSteps: string[]`
  - [ ] `attempts: Record<string, number>`
  - [ ] `compAttempts: Record<string, number>`
  - [ ] `warnings: Array<{ step: string; message: string }>`
  - [ ] `failedStep?: string`
- [ ] Добавить методы для tracking шагов
- [ ] Добавить методы для tracking компенсаций
- [ ] Экспортировать `sagaContextStorage` (AsyncLocalStorage instance)
- [ ] Экспортировать `getSagaContext()` helper

---

## Шаг 3: Декораторы @Saga и @SagaStep

**Файл:** `packages/shared-kernel/src/saga/decorators.ts`

### 3.1 Содержимое decorators.ts

```typescript
/**
 * @file Saga Decorators
 * @description @Saga and @SagaStep decorators for declarative saga definitions
 */

import "reflect-metadata";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { Logger } from "@nestjs/common";
import {
  SagaExecutionContext,
  sagaContextStorage,
  getSagaContext,
} from "./SagaExecutionContext.js";
import {
  type SagaStepConfig,
  type SagaStepMetadata,
  type SagaExecutorConfig,
  type SagaResult,
  type SagaStatus,
  type RetryPolicy,
  type ExecutedStep,
  StepExecutionError,
  StepTimeoutError,
  isRetryableError,
  withTimeout,
  toErrorInfo,
  DEFAULT_STEP_TIMEOUT_MS,
  DEFAULT_COMPENSATION_RETRY,
} from "./types.js";

export const SAGA_DEFINITION_KEY = Symbol("saga:definition");
export const SAGA_STEP_KEY = Symbol("saga:step");

const logger = new Logger("SagaEngine");

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// @SagaStep DECORATOR
// ═══════════════════════════════════════════════════════════════════════════

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
 */
export function SagaStep(config: SagaStepConfig = {}): MethodDecorator {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value as Function;
    const methodName = propertyKey as string;
    const stepName = config.name ?? methodName;
    const compensateMethod =
      config.compensate === false
        ? ""
        : config.compensate ?? `compensate${capitalize(methodName)}`;
    const timeoutMs = config.timeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;
    const isCritical = config.critical !== false; // default: true

    // Store metadata for BrokerSaga to collect
    const existingSteps: SagaStepMetadata[] =
      Reflect.getMetadata(SAGA_STEP_KEY, target) || [];
    const metadata: SagaStepMetadata = {
      stepConfig: { ...config, name: stepName },
      compensateMethod,
      methodName,
    };
    Reflect.defineMetadata(SAGA_STEP_KEY, [...existingSteps, metadata], target);

    // Retry policy for DBOS (default: no retry)
    const retryPolicy = config.retry ?? {
      maxAttempts: 1,
      intervalSeconds: 0,
      backoffRate: 1,
    };

    (descriptor as any).value = async function (...args: unknown[]) {
      const ctx = getSagaContext();

      // Result type for DBOS step - allows control over retry
      type InternalStepResult<T> =
        | { kind: "ok"; data: T }
        | { kind: "nonRetryableFailure"; error: Error }
        | { kind: "timeout"; error: StepTimeoutError };

      let stepResult: InternalStepResult<unknown>;

      try {
        stepResult = await DBOS.runStep<InternalStepResult<unknown>>(
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
      if (
        stepResult.kind === "timeout" ||
        stepResult.kind === "nonRetryableFailure"
      ) {
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

// ═══════════════════════════════════════════════════════════════════════════
// @Saga DECORATOR
// ═══════════════════════════════════════════════════════════════════════════

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
 */
export function Saga(
  name: string,
  config?: SagaExecutorConfig,
): MethodDecorator {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value as Function;

    // Store metadata for registration
    Reflect.defineMetadata(SAGA_DEFINITION_KEY, { name }, target.constructor);

    (descriptor as any).value = async function (
      input: unknown,
    ): Promise<SagaResult> {
      const sagaId = DBOS.workflowID;
      const ctx = new SagaExecutionContext(sagaId);
      const compensationErrors: Error[] = [];

      // Resolve config with defaults
      const compensationRetryPolicy =
        config?.compensationRetryPolicy ?? DEFAULT_COMPENSATION_RETRY;
      const onCompensationExhausted =
        config?.onCompensationExhausted ??
        ((step, method, err, context) => {
          logger.error(
            {
              sagaId: context.sagaId,
              step,
              method,
              error: err.message,
              compAttempts: context.compAttempts,
            },
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
        const stepError =
          error instanceof StepExecutionError ? error : null;
        const failedMethod = stepError?.methodName ?? "unknown";
        const failedStepName = stepError?.stepName ?? "unknown";
        ctx.recordFailure(failedMethod);

        logger.error(
          `Saga ${name} failed at step ${failedStepName}, starting compensation`,
          error,
        );

        // ═══════════════════════════════════════════════════════════════════
        // COMPENSATION PHASE (with retry)
        // ═══════════════════════════════════════════════════════════════════
        const stepsToCompensate = ctx.getStepsToCompensate();

        for (const step of stepsToCompensate) {
          // Skip if compensation explicitly disabled
          if (step.config.compensate === false) {
            logger.debug(
              `Compensation disabled for step: ${step.method}, skipping`,
            );
            continue;
          }

          const compensateMethodName =
            typeof step.config.compensate === "string"
              ? step.config.compensate
              : `compensate${capitalize(step.method)}`;

          // Check if compensation method exists
          if (typeof (this as any)[compensateMethodName] !== "function") {
            logger.debug(
              `No compensation method "${compensateMethodName}" for step: ${step.method}, skipping`,
            );
            continue;
          }

          try {
            // Run compensation with retry policy
            await executeCompensationWithRetry(
              this,
              step,
              compensateMethodName,
              ctx,
              compensationRetryPolicy,
            );
            ctx.markCompensated(step.method);
            logger.debug(`Compensated: ${step.method}`);
          } catch (compError) {
            // Compensation exhausted - call extension hook
            await onCompensationExhausted(
              step.method,
              compensateMethodName,
              compError as Error,
              {
                sagaId: ctx.sagaId,
                args: step.args,
                compAttempts: ctx.getCompAttemptCount(step.method),
              },
            );
            compensationErrors.push(compError as Error);
          }
        }

        const status: SagaStatus =
          compensationErrors.length > 0 ? "failed" : "compensated";

        // Extract original error from StepExecutionError wrapper
        const originalError = stepError?.cause ?? (error as Error);

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

// ═══════════════════════════════════════════════════════════════════════════
// COMPENSATION EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════

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

### 3.2 Чек-лист для decorators.ts

- [ ] Создать файл `packages/shared-kernel/src/saga/decorators.ts`
- [ ] Добавить импорты: `reflect-metadata`, `DBOS`, `Logger`
- [ ] Импортировать типы и helpers из `./types.js`
- [ ] Импортировать context из `./SagaExecutionContext.js`
- [ ] Экспортировать `SAGA_DEFINITION_KEY` и `SAGA_STEP_KEY` symbols
- [ ] Создать helper `capitalize(str: string)`
- [ ] Имплементировать `@SagaStep(config?)` decorator:
  - [ ] Extract method name and step name
  - [ ] Store metadata via `Reflect.defineMetadata`
  - [ ] Wrap method with DBOS.runStep
  - [ ] Handle timeout via `withTimeout()`
  - [ ] Handle retry vs fatal errors
  - [ ] Handle non-critical steps (warnings)
  - [ ] Record step in context on success
- [ ] Имплементировать `@Saga(name, config?)` decorator:
  - [ ] Store metadata via `Reflect.defineMetadata`
  - [ ] Create `SagaExecutionContext`
  - [ ] Run original method in `sagaContextStorage.run()`
  - [ ] On error: run compensations in reverse order
  - [ ] Return `SagaResult` with all tracking info
  - [ ] Wrap with `DBOS.workflow()`
- [ ] Имплементировать `executeCompensationWithRetry()` helper

---

## Шаг 4: BrokerSaga базовый класс

**Файл:** `packages/shared-kernel/src/saga/BrokerSaga.ts`

### 4.1 Содержимое BrokerSaga.ts

```typescript
/**
 * @file BrokerSaga Base Class
 * @description Base class for sagas with broker integration
 */

import { Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import type { ServiceBroker } from "../broker/ServiceBroker.js";
import type { WorkflowRegistry } from "../workflow/WorkflowRegistry.js";
import { SAGA_DEFINITION_KEY } from "./decorators.js";
import "reflect-metadata";

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
      throw new Error(
        `@Saga decorator missing on ${this.constructor.name}.run()`,
      );
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

### 4.2 Чек-лист для BrokerSaga.ts

- [ ] Создать файл `packages/shared-kernel/src/saga/BrokerSaga.ts`
- [ ] Импортировать NestJS lifecycle interfaces
- [ ] Импортировать `ConfiguredInstance` из DBOS
- [ ] Импортировать `ServiceBroker` и `WorkflowRegistry` types
- [ ] Импортировать `SAGA_DEFINITION_KEY` из `./decorators.js`
- [ ] Создать abstract class `BrokerSaga<TInput, TOutput>`:
  - [ ] Extend `ConfiguredInstance`
  - [ ] Implement `OnModuleInit`, `OnModuleDestroy`
  - [ ] Add `logger: Logger`
  - [ ] Add `broker: ServiceBroker` в constructor
  - [ ] Add getter `workflowRegistry`
  - [ ] Add abstract `run(input: TInput): Promise<TOutput>`
  - [ ] Implement `onModuleInit()` → `registerSaga()`
  - [ ] Implement `onModuleDestroy()` → `deregisterSaga()`
  - [ ] Implement private `registerSaga()` и `deregisterSaga()`

---

## Шаг 5: Интеграция с ServiceBroker

**Файл:** `packages/shared-kernel/src/broker/ServiceBroker.ts`

### 5.1 Изменения в ServiceBroker.ts

Добавить метод `runSaga()`:

```typescript
// Добавить import в начало файла
import type { SagaResult } from "../saga/types.js";
import type { IdempotencyContext } from "../workflow/idempotency.js";

// Добавить метод в класс ServiceBroker
/**
 * Execute saga and wait for result.
 * Sagas are special workflows with automatic compensation on failure.
 *
 * @param sagaName - Fully qualified saga name (e.g., "project.storeCreate")
 * @param params - Input parameters for the saga
 * @param idempotencyCtx - Idempotency context for workflow ID generation
 * @returns SagaResult with success/failure status and compensation info
 *
 * @example
 * const result = await broker.runSaga<StoreCreateOutput, StoreCreateInput>(
 *   "project.storeCreate",
 *   { name: "My Store", organizationId: "org-1" },
 *   { source: "client", clientKey: "idmp-123", tenantId: "org-1" },
 * );
 *
 * if (!result.success) {
 *   if (result.compensated) {
 *     throw new UserInputError("Operation failed and was rolled back");
 *   } else {
 *     throw new InternalError("Operation failed with partial rollback");
 *   }
 * }
 */
async runSaga<TResult = unknown, TParams = unknown>(
  sagaName: string,
  params: TParams,
  idempotencyCtx: IdempotencyContext,
): Promise<SagaResult<TResult>> {
  // Sagas use the same mechanism as workflows
  return this.runWorkflow<SagaResult<TResult>, TParams>(
    sagaName,
    params,
    idempotencyCtx,
  );
}
```

### 5.2 Чек-лист для ServiceBroker.ts

- [ ] Добавить import `SagaResult` из `../saga/types.js`
- [ ] Добавить метод `runSaga<TResult, TParams>()`:
  - [ ] Parameters: `sagaName`, `params`, `idempotencyCtx`
  - [ ] Return type: `Promise<SagaResult<TResult>>`
  - [ ] Delegate to `runWorkflow<SagaResult<TResult>, TParams>()`

---

## Шаг 6: Экспорты и index.ts

### 6.1 Создать saga/index.ts

**Файл:** `packages/shared-kernel/src/saga/index.ts`

```typescript
/**
 * @file Saga Engine Public API
 * @description Exports for the Saga Engine module
 */

// Decorators
export {
  Saga,
  SagaStep,
  SAGA_STEP_KEY,
  SAGA_DEFINITION_KEY,
} from "./decorators.js";

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
export {
  DEFAULT_COMPENSATION_RETRY,
  DEFAULT_STEP_TIMEOUT_MS,
} from "./types.js";

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
} from "./types.js";
```

### 6.2 Обновить main index.ts

**Файл:** `packages/shared-kernel/src/index.ts`

Добавить в конец файла:

```typescript
// Saga Engine
export {
  // Decorators
  Saga,
  SagaStep,
  SAGA_STEP_KEY,
  SAGA_DEFINITION_KEY,
  // Base class
  BrokerSaga,
  // Context
  SagaExecutionContext,
  sagaContextStorage,
  getSagaContext,
  // Constants
  DEFAULT_COMPENSATION_RETRY,
  DEFAULT_STEP_TIMEOUT_MS,
  // Errors
  SagaError,
  RetryableError,
  FatalError,
  StepExecutionError,
  StepTimeoutError,
  isRetryableError,
  toErrorInfo,
  withTimeout,
} from "./saga/index.js";

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
} from "./saga/index.js";
```

### 6.3 Чек-лист для экспортов

- [ ] Создать файл `packages/shared-kernel/src/saga/index.ts`
- [ ] Экспортировать все decorators
- [ ] Экспортировать `BrokerSaga`
- [ ] Экспортировать context (для advanced usage)
- [ ] Экспортировать все types
- [ ] Экспортировать constants
- [ ] Экспортировать errors и helpers
- [ ] Обновить `packages/shared-kernel/src/index.ts`:
  - [ ] Re-export всё из `./saga/index.js`

---

## Шаг 7: Unit тесты

**Файл:** `packages/shared-kernel/src/saga/__tests__/saga.spec.ts`

### 7.1 Создать тестовый файл

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SagaExecutionContext,
  sagaContextStorage,
  getSagaContext,
} from "../SagaExecutionContext.js";
import {
  RetryableError,
  FatalError,
  StepExecutionError,
  StepTimeoutError,
  isRetryableError,
  withTimeout,
  toErrorInfo,
} from "../types.js";

describe("SagaExecutionContext", () => {
  it("should track executed steps", () => {
    const ctx = new SagaExecutionContext("saga-123");

    ctx.recordStep("createStore", "createStore", ["id-1", { name: "test" }], {});
    ctx.recordStep("createRoles", "createRoles", ["id-1"], {});

    expect(ctx.getSucceededSteps()).toEqual(["createStore", "createRoles"]);
    expect(ctx.getStepsToCompensate()).toHaveLength(2);
    expect(ctx.getStepsToCompensate()[0].method).toBe("createRoles"); // reversed
  });

  it("should track attempts", () => {
    const ctx = new SagaExecutionContext("saga-123");

    ctx.recordAttempt("step1");
    ctx.recordAttempt("step1");
    ctx.recordAttempt("step2");

    expect(ctx.getAttempts()).toEqual({ step1: 2, step2: 1 });
  });

  it("should track compensation attempts", () => {
    const ctx = new SagaExecutionContext("saga-123");

    ctx.recordCompAttempt("step1");
    ctx.recordCompAttempt("step1");

    expect(ctx.getCompAttemptCount("step1")).toBe(2);
    expect(ctx.getCompAttempts()).toEqual({ step1: 2 });
  });

  it("should track warnings", () => {
    const ctx = new SagaExecutionContext("saga-123");

    ctx.recordWarning("step1", "Service unavailable");

    expect(ctx.getWarnings()).toEqual([
      { step: "step1", message: "Service unavailable" },
    ]);
  });

  it("should track failed step", () => {
    const ctx = new SagaExecutionContext("saga-123");

    ctx.recordFailure("step2");

    expect(ctx.getFailedStep()).toBe("step2");
  });
});

describe("sagaContextStorage", () => {
  it("should throw when called outside context", () => {
    expect(() => getSagaContext()).toThrow(
      "SagaStep called outside of saga execution context",
    );
  });

  it("should return context when inside run()", async () => {
    const ctx = new SagaExecutionContext("saga-456");

    await sagaContextStorage.run(ctx, async () => {
      const retrieved = getSagaContext();
      expect(retrieved.sagaId).toBe("saga-456");
    });
  });
});

describe("Error classes", () => {
  describe("RetryableError", () => {
    it("should be marked as retryable", () => {
      const error = new RetryableError("Network timeout");
      expect(error.retryable).toBe(true);
      expect(error.name).toBe("RetryableError");
    });

    it("should preserve cause", () => {
      const cause = new Error("Original");
      const error = new RetryableError("Wrapped", cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe("FatalError", () => {
    it("should be marked as non-retryable", () => {
      const error = new FatalError("Validation failed");
      expect(error.retryable).toBe(false);
      expect(error.name).toBe("FatalError");
    });

    it("should support custom error code", () => {
      const error = new FatalError("Not found", undefined, "NOT_FOUND");
      expect(error.code).toBe("NOT_FOUND");
    });
  });

  describe("StepExecutionError", () => {
    it("should wrap step context", () => {
      const cause = new Error("DB error");
      const error = new StepExecutionError("createStore", "createStore", cause);

      expect(error.stepName).toBe("createStore");
      expect(error.methodName).toBe("createStore");
      expect(error.cause).toBe(cause);
      expect(error.message).toContain("createStore");
    });
  });

  describe("StepTimeoutError", () => {
    it("should be non-retryable", () => {
      const error = new StepTimeoutError("slowStep", 5000);
      expect(error.retryable).toBe(false);
      expect(error.code).toBe("STEP_TIMEOUT");
      expect(error.message).toContain("5000ms");
    });
  });
});

describe("isRetryableError", () => {
  it("should return true for RetryableError", () => {
    expect(isRetryableError(new RetryableError("test"))).toBe(true);
  });

  it("should return false for FatalError", () => {
    expect(isRetryableError(new FatalError("test"))).toBe(false);
  });

  it("should return true for network errors", () => {
    const patterns = [
      "ECONNREFUSED",
      "ETIMEDOUT",
      "socket hang up",
      "service unavailable",
      "503 Service Temporarily Unavailable",
    ];

    for (const msg of patterns) {
      expect(isRetryableError(new Error(msg))).toBe(true);
    }
  });

  it("should return false for unknown errors", () => {
    expect(isRetryableError(new Error("Something went wrong"))).toBe(false);
    expect(isRetryableError(new TypeError("undefined is not a function"))).toBe(
      false,
    );
  });
});

describe("withTimeout", () => {
  it("should resolve if promise completes in time", async () => {
    const result = await withTimeout(
      Promise.resolve("ok"),
      1000,
      "testStep",
    );
    expect(result).toBe("ok");
  });

  it("should reject with StepTimeoutError if timeout exceeded", async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 100));

    await expect(
      withTimeout(slowPromise, 10, "slowStep"),
    ).rejects.toThrow(StepTimeoutError);
  });

  it("should propagate original error", async () => {
    const failingPromise = Promise.reject(new Error("Original error"));

    await expect(
      withTimeout(failingPromise, 1000, "testStep"),
    ).rejects.toThrow("Original error");
  });
});

describe("toErrorInfo", () => {
  it("should convert Error to serializable shape", () => {
    const error = new FatalError("Test error", undefined, "TEST_CODE");
    const info = toErrorInfo(error);

    expect(info.name).toBe("FatalError");
    expect(info.message).toBe("Test error");
    expect(info.code).toBe("TEST_CODE");
  });

  it("should omit stack in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const error = new Error("test");
    const info = toErrorInfo(error);

    expect(info.stack).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });
});
```

### 7.2 Чек-лист для тестов

- [ ] Создать директорию `packages/shared-kernel/src/saga/__tests__/`
- [ ] Создать файл `saga.spec.ts`
- [ ] Тесты для `SagaExecutionContext`:
  - [ ] Track executed steps
  - [ ] Track attempts
  - [ ] Track compensation attempts
  - [ ] Track warnings
  - [ ] Track failed step
- [ ] Тесты для `sagaContextStorage`:
  - [ ] Throw outside context
  - [ ] Return context inside run()
- [ ] Тесты для error classes:
  - [ ] RetryableError
  - [ ] FatalError
  - [ ] StepExecutionError
  - [ ] StepTimeoutError
- [ ] Тесты для `isRetryableError()`
- [ ] Тесты для `withTimeout()`
- [ ] Тесты для `toErrorInfo()`

---

## Шаг 8: Пример использования (StoreCreateSaga)

**Файл:** `services/project/src/sagas/StoreCreateSaga.ts`

### 8.1 Создать директорию и файл

```bash
mkdir -p services/project/src/sagas
touch services/project/src/sagas/StoreCreateSaga.ts
```

### 8.2 Содержимое StoreCreateSaga.ts

```typescript
import { Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  ServiceBroker,
  RetryableError,
  FatalError,
} from "@shopana/shared-kernel";
import { v7 as uuidv7 } from "uuid";
import { Kernel } from "../kernel/Kernel.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface StoreCreateInput {
  name: string;
  displayName: string;
  locales: string[];
  currencies: string[];
  defaultCurrency: string;
  organizationId: string;
  userId: string;
}

export interface StoreCreateOutput {
  storeId: string;
  organizationId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SAGA IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

@Injectable()
export class StoreCreateSaga extends BrokerSaga<
  StoreCreateInput,
  StoreCreateOutput
> {
  constructor(@InjectBroker("project") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SAGA ENTRY POINT
  // ═══════════════════════════════════════════════════════════════════════

  @Saga("storeCreate")
  async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
    const storeId = await this.generateId();
    await this.createStore(storeId, input);
    await this.createRoles(storeId, input);
    await this.createMediaAssetGroup(storeId); // non-critical
    return { storeId, organizationId: input.organizationId };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEPS
  // ═══════════════════════════════════════════════════════════════════════

  @SagaStep()
  private async generateId(): Promise<string> {
    return uuidv7();
  }
  // No compensation - pure function

  @SagaStep({ critical: true })
  private async createStore(
    id: string,
    input: StoreCreateInput,
  ): Promise<void> {
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
    timeoutMs: 10_000,
  })
  private async createRoles(
    id: string,
    input: StoreCreateInput,
  ): Promise<void> {
    const result = await this.broker.call<{ ok: boolean; error?: any }>(
      "iam.createRoles",
      { domain: `store:${id}` },
    );

    if (result.ok) return;

    if (!result.error?.retryable) {
      throw new FatalError(
        result.error?.message || "Failed to create roles",
        undefined,
        "ROLE_CREATE_FAILED",
      );
    }

    throw new RetryableError(result.error.message);
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

  // ═══════════════════════════════════════════════════════════════════════
  // COMPENSATIONS
  // ═══════════════════════════════════════════════════════════════════════

  async compensateCreateStore(id: string): Promise<void> {
    await this.kernel.repository.store.delete(id);
    this.logger.log({ storeId: id }, "Compensated: deleted store");
  }

  async compensateCreateRoles(id: string): Promise<void> {
    await this.broker.call("iam.deleteRoles", { domain: `store:${id}` });
    this.logger.log({ storeId: id }, "Compensated: deleted roles");
  }

  async compensateCreateMediaAssetGroup(id: string): Promise<void> {
    try {
      await this.broker.call("media.deleteAssetGroup", {
        ownerType: "store",
        ownerId: id,
      });
      this.logger.log({ storeId: id }, "Compensated: deleted media asset group");
    } catch (error) {
      // Non-critical, just log
      this.logger.warn(
        { storeId: id, error },
        "Failed to compensate media asset group",
      );
    }
  }
}
```

### 8.3 Зарегистрировать в модуле

**Файл:** `services/project/src/project.module.ts`

```typescript
import { StoreCreateSaga } from "./sagas/StoreCreateSaga.js";

@Module({
  // ...existing config
  providers: [
    // ...existing providers
    StoreCreateSaga,
  ],
})
export class ProjectModule {}
```

### 8.4 Использование в Resolver

```typescript
import type { SagaResult } from "@shopana/shared-kernel";
import type { StoreCreateInput, StoreCreateOutput } from "../sagas/StoreCreateSaga.js";

@Mutation(() => StorePayload)
async storeCreate(
  @Args("input") input: StoreCreateMutationInput,
  @Ctx() ctx: GraphQLContext,
): Promise<StorePayload> {
  const result = await this.broker.runSaga<StoreCreateOutput, StoreCreateInput>(
    "project.storeCreate",
    {
      ...input,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
    },
    {
      source: "client",
      clientKey: ctx.idempotencyKey ?? uuidv7(),
      tenantId: ctx.organizationId,
    },
  );

  if (!result.success) {
    if (result.compensated) {
      throw new UserInputError("Store creation failed and was rolled back", {
        originalError: result.error?.message,
        failedStep: result.failedStep,
      });
    } else {
      throw new InternalServerError("Store creation failed with partial rollback", {
        originalError: result.error?.message,
        compensationErrors: result.compensationErrors.map((e) => e.message),
      });
    }
  }

  return {
    store: await this.storeService.findById(result.data!.storeId),
    userErrors: [],
  };
}
```

### 8.5 Чек-лист для примера

- [ ] Создать директорию `services/project/src/sagas/`
- [ ] Создать файл `StoreCreateSaga.ts`
- [ ] Определить types: `StoreCreateInput`, `StoreCreateOutput`
- [ ] Создать класс `StoreCreateSaga extends BrokerSaga`:
  - [ ] Constructor с `@InjectBroker("project")`
  - [ ] `@Saga("storeCreate")` на методе `run()`
  - [ ] `@SagaStep()` на `generateId()`
  - [ ] `@SagaStep({ critical: true })` на `createStore()`
  - [ ] `@SagaStep({ retry: ..., timeoutMs: ... })` на `createRoles()`
  - [ ] `@SagaStep({ critical: false })` на `createMediaAssetGroup()`
  - [ ] Compensation methods: `compensateCreateStore`, `compensateCreateRoles`, `compensateCreateMediaAssetGroup`
- [ ] Зарегистрировать в `ProjectModule`
- [ ] Использовать в resolver через `broker.runSaga()`

---

## Чек-лист завершения

### Файлы для создания

| # | Файл | Описание |
|---|------|----------|
| 1 | `packages/shared-kernel/src/saga/types.ts` | Типы, интерфейсы, ошибки |
| 2 | `packages/shared-kernel/src/saga/SagaExecutionContext.ts` | Context с AsyncLocalStorage |
| 3 | `packages/shared-kernel/src/saga/decorators.ts` | @Saga и @SagaStep decorators |
| 4 | `packages/shared-kernel/src/saga/BrokerSaga.ts` | Базовый класс |
| 5 | `packages/shared-kernel/src/saga/index.ts` | Public exports |
| 6 | `packages/shared-kernel/src/saga/__tests__/saga.spec.ts` | Unit тесты |

### Файлы для модификации

| # | Файл | Изменение |
|---|------|-----------|
| 1 | `packages/shared-kernel/src/broker/ServiceBroker.ts` | Добавить `runSaga()` |
| 2 | `packages/shared-kernel/src/index.ts` | Добавить saga exports |

### Порядок имплементации

1. [ ] **types.ts** — все типы и error classes
2. [ ] **SagaExecutionContext.ts** — context и AsyncLocalStorage
3. [ ] **decorators.ts** — @Saga и @SagaStep (зависит от 1 и 2)
4. [ ] **BrokerSaga.ts** — базовый класс (зависит от 3)
5. [ ] **index.ts** — saga exports
6. [ ] **ServiceBroker.ts** — добавить runSaga()
7. [ ] **src/index.ts** — main exports
8. [ ] **saga.spec.ts** — unit тесты
9. [ ] **Build** — `pnpm build` для проверки
10. [ ] **Example** — StoreCreateSaga как reference implementation

### Команды для проверки

```bash
# Сборка shared-kernel
cd packages/shared-kernel && pnpm build

# Запуск тестов
cd packages/shared-kernel && pnpm test

# Type check
pnpm typecheck
```

### Критерии готовности

- [ ] Все файлы созданы согласно плану
- [ ] TypeScript компилируется без ошибок
- [ ] Unit тесты проходят
- [ ] Example saga работает в dev environment
- [ ] Compensation выполняется корректно при ошибке
- [ ] Non-critical steps не блокируют сагу
- [ ] Retry policy работает для transient errors
- [ ] Timeout работает для долгих операций
