# Saga Engine Design

## Overview

Enterprise-grade Saga Engine для декларативного определения распределённых транзакций с автоматическим выполнением компенсаций. Основан на существующей broker/workflow инфраструктуре (DBOS).

## Архитектура

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Saga Definition                              │
│                                                                      │
│  @SagaStep          @SagaStep          @SagaStep                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │ createStore │───▶│ createRoles │───▶│ createMedia │              │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘              │
│         │                  │                  │                      │
│         ▼                  ▼                  ▼                      │
│  compensate...       compensate...      compensate...               │
│  (by convention)     (by convention)    (by convention)             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SagaExecutor                                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 1. Execute steps sequentially                                 │   │
│  │ 2. Track completed steps in SagaContext                       │   │
│  │ 3. On failure → run compensations in reverse order            │   │
│  │ 4. Persist state via DBOS for durability                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
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
/** Результат выполнения шага */
export interface StepResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
}

/** Retry policy (aligned with ActionMetadata from broker) */
export interface RetryPolicy {
  maxAttempts: number;
  intervalSeconds: number;
  backoffRate: number;
}

/** Конфигурация шага саги */
export interface SagaStepConfig {
  /** Имя шага для логирования и идентификации */
  name: string;
  /** Критичность шага - если false, ошибка не останавливает сагу */
  critical?: boolean;
  /**
   * Override compensation method name.
   * По умолчанию: compensate + PascalCase(name)
   * Например: name="createStore" → compensateCreateStore
   */
  compensate?: string;
  /**
   * Retry policy for transient errors.
   * Fatal errors skip retry and trigger immediate compensation.
   */
  retry?: RetryPolicy;
  /** Timeout в миллисекундах */
  timeout?: number;
}

/** Метаданные шага с компенсацией */
export interface SagaStepMetadata {
  stepConfig: SagaStepConfig;
  /** Resolved compensation method name */
  compensateMethod: string;
  order: number;
}

/** Runtime step definition used by SagaExecutor */
export interface SagaStepDefinition {
  method: string;
  config: SagaStepConfig;
  compensateMethod: string;
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

/**
 * Add jitter to prevent thundering herd on mass failures.
 * Returns interval with ±25% random variance.
 */
export function addJitter(intervalMs: number): number {
  const jitter = intervalMs * 0.25;
  return intervalMs + (Math.random() * 2 - 1) * jitter;
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

/** Контекст выполнения саги */
export interface SagaContext<TInput = unknown> {
  /** Уникальный ID саги */
  sagaId: string;
  /** Входные параметры */
  input: TInput;
  /** Текущий статус */
  status: SagaStatus;
  /** Результаты выполненных шагов (по имени шага) - Record для сериализации */
  stepResults: Record<string, StepResult>;
  /**
   * Все успешно выполненные шаги (immutable history).
   * Никогда не уменьшается - для диагностики.
   */
  executedSteps: string[];
  /**
   * Шаги, которые были скомпенсированы.
   * Растёт по мере выполнения компенсаций.
   */
  compensatedSteps: string[];
  /** Ошибка, вызвавшая компенсацию */
  failureError?: Error;
  /** Шаг, на котором произошла ошибка */
  failedStep?: string;
  /** Warnings от non-critical шагов */
  warnings: Array<{ step: string; message: string }>;
}

/** Результат выполнения саги (serializable) */
export interface SagaResult<TOutput = unknown> {
  success: boolean;
  status: SagaStatus;
  data?: TOutput;
  /** Error info (serializable, no Error objects) */
  error?: ErrorInfo;
  failedStep?: string;
  /** All steps that were executed (history) */
  executedSteps: string[];
  /** Steps that were successfully compensated */
  compensatedSteps: string[];
  compensated: boolean;
  /** Compensation errors (serializable) */
  compensationErrors: ErrorInfo[];
  warnings: Array<{ step: string; message: string }>;
}
```

### 2. Декораторы

**Файл:** `packages/shared-kernel/src/saga/decorators.ts`

```typescript
import "reflect-metadata";
import { DBOS } from "@dbos-inc/dbos-sdk";

export const SAGA_STEP_KEY = Symbol("saga:step");
export const SAGA_DEFINITION_KEY = Symbol("saga:definition");

/**
 * Декоратор для определения шага саги.
 *
 * Convention-based compensation:
 * - Для шага "createStore" автоматически ищется метод "compensateCreateStore"
 * - Можно переопределить через опцию `compensate: "customMethodName"`
 * - Если compensation метод не найден - шаг считается некомпенсируемым
 *
 * Compensation signature: `compensateX(ctx: SagaContextManager, stepResult: T)`
 * - stepResult содержит данные, возвращённые шагом (для rollback)
 *
 * @example
 * @SagaStep({ name: "createStore" })
 * async createStore(ctx: SagaContext<StoreInput>): Promise<string> {
 *   const storeId = await this.repository.store.create(ctx.input);
 *   return storeId; // This will be passed to compensation
 * }
 *
 * // Compensation receives stepResult (storeId)
 * async compensateCreateStore(ctx: SagaContext, storeId: string): Promise<void> {
 *   await this.repository.store.delete(storeId);
 * }
 */
export function SagaStep(config: SagaStepConfig): MethodDecorator {
  return function(target, propertyKey, descriptor) {
    // IMPORTANT: Always read/write metadata from prototype (target)
    const existingSteps = Reflect.getMetadata(SAGA_STEP_KEY, target) || [];

    // Convention: compensate + PascalCase(stepName)
    const defaultCompensateMethod = `compensate${capitalize(config.name)}`;

    const metadata: SagaStepMetadata = {
      stepConfig: config,
      compensateMethod: config.compensate ?? defaultCompensateMethod,
      order: existingSteps.length,
    };

    // Store on prototype for consistent retrieval
    Reflect.defineMetadata(SAGA_STEP_KEY, [...existingSteps, {
      method: propertyKey,
      metadata
    }], target);

    // DBOS.step for durability only - NO RETRIES here
    // All retries are handled by SagaExecutor to avoid double-retry
    return DBOS.step({
      retriesAllowed: false,  // Executor handles retries
      maxAttempts: 1,
    })(target, propertyKey as string, descriptor);
  };
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Декоратор класса для определения саги.
 *
 * @example
 * @Saga("storeCreate")
 * class StoreCreateSaga extends BrokerSaga<StoreInput, StoreOutput> { ... }
 */
export function Saga(name: string): ClassDecorator {
  return function(target) {
    Reflect.defineMetadata(SAGA_DEFINITION_KEY, { name }, target);
  };
}
```

### 3. SagaContext Manager

**Файл:** `packages/shared-kernel/src/saga/SagaContext.ts`

```typescript
/**
 * Управляет состоянием и результатами шагов саги.
 * Uses Record (not Map) for easy serialization/observability.
 */
export class SagaContextManager<TInput = unknown> {
  private context: SagaContext<TInput>;
  private readonly broker: ServiceBroker;

  constructor(sagaId: string, input: TInput, broker: ServiceBroker) {
    this.broker = broker;
    this.context = {
      sagaId,
      input,
      status: "pending",
      stepResults: {},
      executedSteps: [],      // immutable history
      compensatedSteps: [],   // grows during compensation
      warnings: [],
    };
  }

  /** Saga ID */
  get sagaId(): string {
    return this.context.sagaId;
  }

  /**
   * Generate idempotency key for external calls.
   * Format: sagaId:stepName
   */
  getIdempotencyKey(stepName: string): string {
    return `${this.context.sagaId}:${stepName}`;
  }

  /**
   * Execute broker call with automatic idempotency.
   * This is the PREFERRED way to make external calls from saga steps.
   *
   * @example
   * const result = await ctx.call("createRoles", () =>
   *   this.broker.call<IAM.CreateRolesResult>("iam.createRoles", params)
   * );
   */
  async call<TResult>(
    stepName: string,
    fn: (idempotencyKey: string) => Promise<TResult>,
  ): Promise<TResult> {
    const idempotencyKey = this.getIdempotencyKey(stepName);
    return fn(idempotencyKey);
  }

  /**
   * Execute broker action with automatic idempotency (convenience method).
   *
   * @example
   * const result = await ctx.brokerCall<IAM.CreateRolesResult>(
   *   "createRoles",
   *   "iam.createRoles",
   *   params
   * );
   */
  async brokerCall<TResult, TParams = unknown>(
    stepName: string,
    action: string,
    params: TParams,
  ): Promise<TResult> {
    return this.broker.call<TResult, TParams>(action, params, {
      idempotencyKey: this.getIdempotencyKey(stepName),
    });
  }

  /** Получить текущий контекст (deep immutable snapshot) */
  getContext(): Readonly<SagaContext<TInput>> {
    return {
      ...this.context,
      stepResults: { ...this.context.stepResults },
      executedSteps: [...this.context.executedSteps],
      compensatedSteps: [...this.context.compensatedSteps],
      warnings: [...this.context.warnings],
    };
  }

  /** Получить входные данные */
  getInput(): TInput {
    return this.context.input;
  }

  /** Получить результат конкретного шага */
  getStepResult<T>(stepName: string): T | undefined {
    return this.context.stepResults[stepName]?.data as T | undefined;
  }

  /** Получить полный StepResult (для передачи в компенсацию) */
  getStepResultFull(stepName: string): StepResult | undefined {
    return this.context.stepResults[stepName];
  }

  /** Установить статус */
  setStatus(status: SagaStatus): void {
    this.context.status = status;
  }

  /** Записать успешный результат шага */
  recordSuccess<T>(stepName: string, data: T): void {
    this.context.stepResults[stepName] = { success: true, data };
    this.context.executedSteps.push(stepName); // immutable history
  }

  /** Записать ошибку шага */
  recordFailure(stepName: string, error: Error): void {
    this.context.stepResults[stepName] = { success: false, error };
    this.context.failedStep = stepName;
    this.context.failureError = error;
  }

  /** Записать warning от non-critical шага */
  recordWarning(stepName: string, error: Error): void {
    this.context.warnings.push({ step: stepName, message: error.message });
  }

  /**
   * Получить шаги для компенсации (в обратном порядке).
   * Returns only steps that haven't been compensated yet.
   */
  getStepsToCompensate(): string[] {
    const compensated = new Set(this.context.compensatedSteps);
    return [...this.context.executedSteps]
      .filter((step) => !compensated.has(step))
      .reverse();
  }

  /** Mark step as compensated (adds to compensatedSteps) */
  markCompensated(stepName: string): void {
    if (!this.context.compensatedSteps.includes(stepName)) {
      this.context.compensatedSteps.push(stepName);
    }
  }

  /** Build final SagaResult (serializable) */
  toResult<TOutput>(
    success: boolean,
    data?: TOutput,
    error?: Error,
    compensationErrors: Error[] = [],
  ): SagaResult<TOutput> {
    return {
      success,
      status: this.context.status,
      data,
      error: error ? toErrorInfo(error) : undefined,
      failedStep: this.context.failedStep,
      executedSteps: [...this.context.executedSteps],
      compensatedSteps: [...this.context.compensatedSteps],
      compensated: !success && compensationErrors.length === 0,
      compensationErrors: compensationErrors.map(toErrorInfo),
      warnings: [...this.context.warnings],
    };
  }
}
```

### 4. SagaExecutor

**Файл:** `packages/shared-kernel/src/saga/SagaExecutor.ts`

```typescript
import { Logger } from "@nestjs/common";
import { DBOS } from "@dbos-inc/dbos-sdk";

/**
 * Движок выполнения саги с автоматической компенсацией.
 *
 * Error handling strategy (aligned with broker pattern):
 * - RetryableError → retry according to step's retry policy
 * - FatalError → immediate compensation, no retry
 * - Unknown errors → FATAL by default (no retry) - forces explicit classification
 *
 * Compensation signature: compensateX(ctx, stepResult)
 * - stepResult is the value returned by the original step
 */
export class SagaExecutor<TInput, TOutput> {
  private readonly logger = new Logger(SagaExecutor.name);

  constructor(
    private readonly sagaInstance: BrokerSaga<TInput, TOutput>,
    private readonly steps: SagaStepDefinition[],
    /** Map: stepName → compensationMethodName */
    private readonly compensations: Map<string, string>,
  ) {}

  /**
   * Выполняет сагу с автоматической компенсацией при ошибках.
   */
  async execute(sagaId: string, input: TInput): Promise<SagaResult<TOutput>> {
    const ctx = new SagaContextManager<TInput>(
      sagaId,
      input,
      this.sagaInstance.broker, // Pass broker for ctx.brokerCall()
    );
    ctx.setStatus("running");

    const compensationErrors: Error[] = [];
    let output: TOutput | undefined;

    try {
      // Execute steps sequentially
      for (const step of this.steps) {
        this.logger.debug(`Executing step: ${step.config.name}`);

        try {
          const result = await this.executeStepWithRetry(step, ctx);
          ctx.recordSuccess(step.config.name, result);
        } catch (error) {
          if (step.config.critical !== false) {
            ctx.recordFailure(step.config.name, error as Error);
            throw error; // Trigger compensation
          }

          // Non-critical: record warning, continue
          ctx.recordWarning(step.config.name, error as Error);
          this.logger.warn(
            `Non-critical step ${step.config.name} failed, continuing`,
            error,
          );
        }
      }

      // All steps completed - build output
      output = await this.sagaInstance.buildOutput(ctx);
      ctx.setStatus("completed");

      return ctx.toResult(true, output);

    } catch (error) {
      this.logger.error(
        `Saga failed at step ${ctx.getContext().failedStep}`,
        error,
      );
      ctx.setStatus("compensating");

      // Run compensations in reverse order
      const stepsToCompensate = ctx.getStepsToCompensate();

      for (const stepName of stepsToCompensate) {
        const compensateMethod = this.compensations.get(stepName);
        if (!compensateMethod) {
          this.logger.debug(`No compensation for step: ${stepName}, skipping`);
          continue;
        }

        // Get the step result to pass to compensation
        const stepResult = ctx.getStepResultFull(stepName);

        try {
          this.logger.debug(`Running compensation: ${compensateMethod}`);
          await this.executeCompensationWithRetry(
            compensateMethod,
            ctx,
            stepResult?.data,
          );
          ctx.markCompensated(stepName);
        } catch (compError) {
          this.logger.error(`Compensation ${compensateMethod} failed`, compError);
          compensationErrors.push(compError as Error);
        }
      }

      ctx.setStatus(compensationErrors.length > 0 ? "failed" : "compensated");

      return ctx.toResult(false, undefined, error as Error, compensationErrors);
    }
  }

  /**
   * Execute step with retry policy.
   * FatalError / unknown → no retry, immediate compensation
   * RetryableError → retry according to policy with jitter
   */
  private async executeStepWithRetry(
    step: SagaStepDefinition,
    ctx: SagaContextManager<TInput>,
  ): Promise<unknown> {
    const policy = step.config.retry ?? {
      maxAttempts: 1,
      intervalSeconds: 0,
      backoffRate: 1,
    };

    let lastError: Error | undefined;
    let interval = policy.intervalSeconds * 1000;

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      try {
        return await this.executeStep(step, ctx);
      } catch (error) {
        lastError = error as Error;

        // FatalError or unknown → no retry
        if (!isRetryableError(error)) {
          this.logger.debug(
            `Step ${step.config.name} failed with non-retryable error, no retry`,
          );
          throw error;
        }

        // Last attempt - throw
        if (attempt === policy.maxAttempts) {
          this.logger.warn(
            `Step ${step.config.name} failed after ${attempt} attempts`,
          );
          throw error;
        }

        // Wait before retry (with jitter to prevent thundering herd)
        const jitteredInterval = addJitter(interval);
        this.logger.debug(
          `Step ${step.config.name} attempt ${attempt} failed, retrying in ${jitteredInterval}ms`,
        );
        await this.sleep(jitteredInterval);
        interval *= policy.backoffRate;
      }
    }

    throw lastError;
  }

  /**
   * Execute compensation with aggressive retry.
   * Compensations MUST succeed - they get more attempts and always retry.
   */
  private async executeCompensationWithRetry(
    methodName: string,
    ctx: SagaContextManager<TInput>,
    stepResult: unknown,
  ): Promise<void> {
    const policy: RetryPolicy = {
      maxAttempts: 10,
      intervalSeconds: 1,
      backoffRate: 2,
    };

    let lastError: Error | undefined;
    let interval = policy.intervalSeconds * 1000;

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      try {
        await this.executeCompensation(methodName, ctx, stepResult);
        return;
      } catch (error) {
        lastError = error as Error;

        if (attempt === policy.maxAttempts) {
          this.logger.error(
            `Compensation ${methodName} failed after ${attempt} attempts`,
          );
          throw error;
        }

        const jitteredInterval = addJitter(interval);
        this.logger.warn(
          `Compensation ${methodName} attempt ${attempt} failed, retrying in ${jitteredInterval}ms`,
        );
        await this.sleep(jitteredInterval);
        interval *= policy.backoffRate;
      }
    }

    throw lastError;
  }

  private async executeStep(
    step: SagaStepDefinition,
    ctx: SagaContextManager<TInput>,
  ): Promise<unknown> {
    const method = (this.sagaInstance as any)[step.method];

    if (step.config.timeout) {
      return Promise.race([
        method.call(this.sagaInstance, ctx),
        this.timeout(step.config.timeout, step.config.name),
      ]);
    }

    return method.call(this.sagaInstance, ctx);
  }

  /**
   * Execute compensation method with stepResult.
   * Signature: compensateX(ctx: SagaContextManager, stepResult: T)
   */
  private async executeCompensation(
    methodName: string,
    ctx: SagaContextManager<TInput>,
    stepResult: unknown,
  ): Promise<void> {
    const method = (this.sagaInstance as any)[methodName];
    await method.call(this.sagaInstance, ctx, stepResult);
  }

  private timeout(ms: number, stepName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new RetryableError(`Step ${stepName} timed out after ${ms}ms`));
      }, ms);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### 5. BrokerSaga Base Class

**Файл:** `packages/shared-kernel/src/saga/BrokerSaga.ts`

```typescript
import { Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfiguredInstance, DBOS } from "@dbos-inc/dbos-sdk";
import { ServiceBroker } from "../broker/ServiceBroker.js";
import { WorkflowRegistry } from "../workflow/WorkflowRegistry.js";

/**
 * Базовый класс для саг с broker интеграцией.
 *
 * @example
 * @Saga("storeCreate")
 * @Injectable()
 * export class StoreCreateSaga extends BrokerSaga<StoreInput, StoreOutput> {
 *
 *   @SagaStep({ name: "createStore", critical: true })
 *   @Compensate("deleteStore")
 *   async createStore(ctx: SagaContextManager<StoreInput>): Promise<string> {
 *     const input = ctx.getInput();
 *     return this.repository.store.create(input);
 *   }
 *
 *   @SagaCompensation({ name: "deleteStore" })
 *   async deleteStore(
 *     ctx: SagaContextManager<StoreInput>,
 *     storeId: string
 *   ): Promise<void> {
 *     await this.repository.store.delete(storeId);
 *   }
 *
 *   @SagaStep({ name: "createRoles", critical: true })
 *   @Compensate("deleteRoles")
 *   async createRoles(ctx: SagaContextManager<StoreInput>): Promise<void> {
 *     const storeId = ctx.getStepResult<string>("createStore");
 *     await this.broker.call("iam.createRoles", { domain: `store:${storeId}` });
 *   }
 *
 *   @SagaCompensation({ name: "deleteRoles" })
 *   async deleteRoles(ctx: SagaContextManager<StoreInput>): Promise<void> {
 *     const storeId = ctx.getStepResult<string>("createStore");
 *     await this.broker.call("iam.deleteRoles", { domain: `store:${storeId}` });
 *   }
 *
 *   // Формирует выходные данные из контекста
 *   buildOutput(ctx: SagaContextManager<StoreInput>): StoreOutput {
 *     return {
 *       storeId: ctx.getStepResult<string>("createStore")!,
 *       organizationId: ctx.getInput().organizationId,
 *     };
 *   }
 * }
 */
export abstract class BrokerSaga<TInput, TOutput>
  extends ConfiguredInstance
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger: Logger;
  private executor: SagaExecutor<TInput, TOutput> | null = null;

  // Public for SagaExecutor to pass to SagaContextManager
  constructor(public readonly broker: ServiceBroker) {
    super(new.target.name);
    this.logger = new Logger(this.constructor.name);
  }

  /** Доступ к workflow registry */
  protected get workflowRegistry(): WorkflowRegistry {
    return this.broker.getWorkflowRegistry();
  }

  /** Абстрактный метод для построения выходных данных */
  abstract buildOutput(ctx: SagaContextManager<TInput>): TOutput | Promise<TOutput>;

  onModuleInit(): void {
    this.initializeExecutor();
    this.registerSaga();
  }

  onModuleDestroy(): void {
    this.deregisterSaga();
  }

  /**
   * Инициализирует executor на основе декораторов.
   */
  private initializeExecutor(): void {
    // IMPORTANT: Always read metadata from prototype for consistency
    const prototype = Object.getPrototypeOf(this);
    const steps = this.collectSteps(prototype);
    const compensations = this.collectCompensations(prototype, steps);

    this.executor = new SagaExecutor<TInput, TOutput>(
      this,
      steps,
      compensations,
    );
  }

  /**
   * Собирает шаги из декораторов @SagaStep.
   * Reads from prototype to match where decorator stores metadata.
   */
  private collectSteps(prototype: object): SagaStepDefinition[] {
    const stepsMetadata = Reflect.getMetadata(SAGA_STEP_KEY, prototype) || [];
    return stepsMetadata
      .sort((a: any, b: any) => a.metadata.order - b.metadata.order)
      .map((s: any) => ({
        method: s.method,
        config: s.metadata.stepConfig,
        compensateMethod: s.metadata.compensateMethod,
      }));
  }

  /**
   * Собирает компенсации по convention: compensate + PascalCase(stepName)
   * Uses already collected steps to avoid re-reading metadata.
   */
  private collectCompensations(
    prototype: object,
    steps: SagaStepDefinition[],
  ): Map<string, string> {
    const compensations = new Map<string, string>();

    for (const step of steps) {
      const compensateMethod = step.compensateMethod;

      // Check if compensation method exists on the class
      if (typeof (this as any)[compensateMethod] === "function") {
        compensations.set(step.config.name, compensateMethod);
        this.logger.debug(
          `Found compensation for step "${step.config.name}": ${compensateMethod}`,
        );
      } else {
        this.logger.debug(
          `No compensation method "${compensateMethod}" for step "${step.config.name}"`,
        );
      }
    }

    return compensations;
  }

  /**
   * Регистрирует сагу в workflow registry.
   */
  private registerSaga(): void {
    const sagaMeta = Reflect.getMetadata(SAGA_DEFINITION_KEY, this.constructor);
    if (!sagaMeta) {
      throw new Error(`@Saga decorator missing on ${this.constructor.name}`);
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

  /**
   * Точка входа саги - вызывается через broker.runWorkflow().
   * DBOS требует метод с именем `run`.
   */
  @DBOS.workflow()
  async run(input: TInput): Promise<SagaResult<TOutput>> {
    const sagaId = DBOS.workflowID;
    return this.executor!.execute(sagaId, input);
  }
}
```

### 6. Интеграция с ServiceBroker

**Файл:** `packages/shared-kernel/src/broker/ServiceBroker.ts` (additions)

```typescript
// Добавить метод для запуска саги
async runSaga<TResult, TParams>(
  sagaName: string,
  params: TParams,
  idempotencyCtx?: IdempotencyContext,
): Promise<SagaResult<TResult>> {
  // Использует тот же механизм, что и runWorkflow
  return this.runWorkflow<SagaResult<TResult>, TParams>(
    sagaName,
    params,
    idempotencyCtx,
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
  Compensate,
  SagaCompensation,
  SagaContextManager,
  SagaResult,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { Media, IAM } from "@shopana/broker-types";
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

@Saga("storeCreate")
@Injectable()
export class StoreCreateSaga extends BrokerSaga<StoreCreateInput, StoreCreateOutput> {
  constructor(@InjectBroker("project") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  // ═══════════════════════════════════════════════════════════════
  // STEPS
  // ═══════════════════════════════════════════════════════════════

  @SagaStep({ name: "generateId" })
  async generateId(ctx: SagaContextManager<StoreCreateInput>): Promise<string> {
    return uuidv7();
  }
  // No compensateGenerateId → step is non-compensable (no side effects)

  @SagaStep({ name: "createStore" })
  async createStore(ctx: SagaContextManager<StoreCreateInput>): Promise<void> {
    const input = ctx.getInput();
    const storeId = ctx.getStepResult<string>("generateId")!;

    await this.kernel.repository.store.create({
      id: storeId,
      organizationId: input.organizationId,
      name: input.name,
      displayName: input.displayName,
      locales: input.locales,
      currencies: input.currencies,
      defaultCurrency: input.defaultCurrency,
    });
  }

  @SagaStep({
    name: "createRoles",
    retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
  })
  async createRoles(ctx: SagaContextManager<StoreCreateInput>): Promise<void> {
    const input = ctx.getInput();
    const storeId = ctx.getStepResult<string>("generateId")!;

    let result: IAM.CreateRolesResult;
    try {
      // ctx.brokerCall automatically adds idempotency key
      result = await ctx.brokerCall<IAM.CreateRolesResult>(
        "createRoles", // step name for idempotency key
        "iam.createRoles",
        {
          userId: input.userId,
          organizationId: input.organizationId,
          domain: `store:${storeId}`,
          roles: buildStoreRoles(),
        },
      );
    } catch (error) {
      // Network/service errors → retryable
      throw new RetryableError("IAM service unavailable", error as Error);
    }

    if (!result.success) {
      // Business error → fatal, no retry, immediate compensation
      throw new FatalError(result.error || "Failed to create store roles");
    }
  }

  @SagaStep({
    name: "assignAdminRole",
    retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
  })
  async assignAdminRole(ctx: SagaContextManager<StoreCreateInput>): Promise<void> {
    const input = ctx.getInput();
    const storeId = ctx.getStepResult<string>("generateId")!;

    const result = await this.broker.call<IAM.AssignRoleResult>(
      "iam.assignRole",
      {
        userId: input.userId,
        organizationId: input.organizationId,
        domain: `store:${storeId}`,
        roleName: "admin",
      },
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to assign admin role");
    }
  }

  @SagaStep({
    name: "createMediaAssetGroup",
    critical: false, // Continue even if media service is down
    timeout: 5000,
  })
  async createMediaAssetGroup(ctx: SagaContextManager<StoreCreateInput>): Promise<void> {
    const storeId = ctx.getStepResult<string>("generateId")!;

    await this.broker.call<Media.CreateAssetGroupResult>(
      "media.createAssetGroup",
      { ownerType: "store", ownerId: storeId },
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPENSATIONS
  // Convention: compensate + PascalCase(stepName)
  // Signature: compensateX(ctx, stepResult) - stepResult is what step returned
  // ═══════════════════════════════════════════════════════════════

  // stepResult = storeId returned by createStore step (but we use generateId result)
  async compensateCreateStore(
    ctx: SagaContextManager<StoreCreateInput>,
    _stepResult: void,
  ): Promise<void> {
    const storeId = ctx.getStepResult<string>("generateId");
    if (storeId) {
      await this.kernel.repository.store.delete(storeId);
      this.logger.info({ storeId }, "Compensated: deleted store");
    }
  }

  async compensateCreateRoles(
    ctx: SagaContextManager<StoreCreateInput>,
    _stepResult: void,
  ): Promise<void> {
    const input = ctx.getInput();
    const storeId = ctx.getStepResult<string>("generateId");

    if (storeId) {
      await this.broker.call("iam.deleteRoles", {
        organizationId: input.organizationId,
        domain: `store:${storeId}`,
      });
      this.logger.info({ storeId }, "Compensated: deleted roles");
    }
  }

  async compensateAssignAdminRole(
    ctx: SagaContextManager<StoreCreateInput>,
    _stepResult: void,
  ): Promise<void> {
    const input = ctx.getInput();
    const storeId = ctx.getStepResult<string>("generateId");

    if (storeId) {
      await this.broker.call("iam.unassignRole", {
        userId: input.userId,
        organizationId: input.organizationId,
        domain: `store:${storeId}`,
        roleName: "admin",
      });
      this.logger.info({ storeId, userId: input.userId }, "Compensated: unassigned admin role");
    }
  }

  async compensateCreateMediaAssetGroup(
    ctx: SagaContextManager<StoreCreateInput>,
    _stepResult: void,
  ): Promise<void> {
    const storeId = ctx.getStepResult<string>("generateId");

    if (storeId) {
      try {
        await this.broker.call("media.deleteAssetGroup", {
          ownerType: "store",
          ownerId: storeId,
        });
        this.logger.info({ storeId }, "Compensated: deleted media asset group");
      } catch (error) {
        // Non-critical, just log
        this.logger.warn({ storeId, error }, "Failed to compensate media asset group");
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════

  buildOutput(ctx: SagaContextManager<StoreCreateInput>): StoreCreateOutput {
    return {
      storeId: ctx.getStepResult<string>("generateId")!,
      organizationId: ctx.getInput().organizationId,
    };
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
    {
      source: "client",
      clientKey: ctx.idempotencyKey,
      tenantId: ctx.organizationId,
      apiKeyId: ctx.apiKeyId,
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
├── index.ts                 # Public exports
├── types.ts                 # SagaContext, SagaResult, StepResult, ErrorInfo
├── errors.ts                # SagaError, RetryableError, FatalError, isRetryableError, toErrorInfo
├── utils.ts                 # addJitter
├── decorators.ts            # @Saga, @SagaStep
├── SagaContext.ts           # SagaContextManager (with ctx.brokerCall)
├── SagaExecutor.ts          # Движок выполнения
└── BrokerSaga.ts            # Базовый класс
```

### Public API (index.ts exports)

```typescript
// Decorators
export { Saga, SagaStep } from "./decorators.js";

// Base class
export { BrokerSaga } from "./BrokerSaga.js";

// Context
export { SagaContextManager } from "./SagaContext.js";

// Types
export type {
  SagaContext,
  SagaResult,
  SagaStatus,
  SagaStepConfig,
  StepResult,
  RetryPolicy,
  ErrorInfo,
} from "./types.js";

// Errors
export {
  SagaError,
  RetryableError,
  FatalError,
  isRetryableError,
  toErrorInfo,
} from "./errors.js";
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
@SagaStep({ name: "createRoles", retry: { maxAttempts: 3, ... } })
async createRoles(ctx: SagaContextManager<Input>): Promise<void> {
  let result: IAM.CreateRolesResult;

  try {
    // ctx.brokerCall automatically adds idempotency key (sagaId:stepName)
    result = await ctx.brokerCall<IAM.CreateRolesResult>(
      "createRoles",       // step name for idempotency
      "iam.createRoles",   // action
      params,
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
```

### Idempotency API (built into context)

**ALWAYS use `ctx.brokerCall()` or `ctx.call()` for external calls.**
This enforces idempotency by contract, not by convention.

```typescript
// Option 1: ctx.brokerCall (recommended for broker actions)
const result = await ctx.brokerCall<IAM.Result>("createRoles", "iam.createRoles", params);

// Option 2: ctx.call (for custom idempotency logic)
const result = await ctx.call("createRoles", (idempotencyKey) =>
  this.customClient.createWithIdempotency(params, idempotencyKey)
);

// Option 3: Manual (discouraged, but available)
const idempotencyKey = ctx.getIdempotencyKey("createRoles"); // sagaId:createRoles
```

### Why idempotency matters for timeouts

Timeout via `Promise.race` doesn't cancel the actual operation. The step may complete
after timeout and create resources. With idempotency:
- Retry with same key → returns cached result (no duplicate)
- "Already exists" responses should be treated as success, not fatal

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
