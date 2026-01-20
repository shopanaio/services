# Saga Engine Design

## Overview

Enterprise-grade Saga Engine для декларативного определения распределённых транзакций с автоматическим выполнением компенсаций. Основан на существующей broker/workflow инфраструктуре (DBOS).

## Архитектура

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Saga Definition                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ @SagaStep   │  │ @SagaStep   │  │ @SagaStep   │                  │
│  │ createStore │──│ createRoles │──│ createMedia │                  │
│  │             │  │             │  │             │                  │
│  │ @Compensate │  │ @Compensate │  │ @Compensate │                  │
│  │ deleteStore │  │ deleteRoles │  │ deleteMedia │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
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

/** Конфигурация шага саги */
export interface SagaStepConfig {
  /** Имя шага для логирования */
  name: string;
  /** Критичность шага - если false, ошибка не останавливает сагу */
  critical?: boolean;
  /** Retry policy */
  retry?: {
    maxAttempts: number;
    intervalSeconds: number;
    backoffRate: number;
  };
  /** Timeout в миллисекундах */
  timeout?: number;
}

/** Конфигурация компенсации */
export interface CompensateConfig {
  /** Имя компенсирующего шага */
  name: string;
  /** Retry policy для компенсации (должна быть более агрессивной) */
  retry?: {
    maxAttempts: number;
    intervalSeconds: number;
    backoffRate: number;
  };
}

/** Метаданные шага с компенсацией */
export interface SagaStepMetadata {
  stepConfig: SagaStepConfig;
  compensateMethod?: string;
  compensateConfig?: CompensateConfig;
  order: number;
}

/** Состояние выполнения саги */
export type SagaStatus =
  | "pending"
  | "running"
  | "completed"
  | "compensating"
  | "compensated"
  | "failed";

/** Контекст выполнения саги */
export interface SagaContext<TInput = unknown> {
  /** Уникальный ID саги */
  sagaId: string;
  /** Входные параметры */
  input: TInput;
  /** Текущий статус */
  status: SagaStatus;
  /** Результаты выполненных шагов (по имени шага) */
  stepResults: Map<string, StepResult>;
  /** Порядок выполненных шагов (для компенсации в обратном порядке) */
  completedSteps: string[];
  /** Ошибка, вызвавшая компенсацию */
  failureError?: Error;
  /** Шаг, на котором произошла ошибка */
  failedStep?: string;
}

/** Результат выполнения саги */
export interface SagaResult<TOutput = unknown> {
  success: boolean;
  data?: TOutput;
  error?: Error;
  compensated: boolean;
  compensationErrors: Error[];
}
```

### 2. Декораторы

**Файл:** `packages/shared-kernel/src/saga/decorators.ts`

```typescript
import "reflect-metadata";

export const SAGA_STEP_KEY = Symbol("saga:step");
export const SAGA_COMPENSATE_KEY = Symbol("saga:compensate");
export const SAGA_DEFINITION_KEY = Symbol("saga:definition");

/**
 * Декоратор для определения шага саги.
 *
 * @example
 * @SagaStep({ name: "createStore", critical: true })
 * async createStore(ctx: SagaContext<StoreInput>): Promise<string> {
 *   const storeId = await this.repository.store.create(ctx.input);
 *   return storeId;
 * }
 */
export function SagaStep(config: SagaStepConfig): MethodDecorator {
  return function(target, propertyKey, descriptor) {
    const existingSteps = Reflect.getMetadata(SAGA_STEP_KEY, target) || [];
    const metadata: SagaStepMetadata = {
      stepConfig: config,
      order: existingSteps.length,
    };
    Reflect.defineMetadata(SAGA_STEP_KEY, [...existingSteps, {
      method: propertyKey,
      metadata
    }], target);

    // Wrap with DBOS.step for durability
    return DBOS.step({
      retriesAllowed: config.retry !== undefined,
      maxAttempts: config.retry?.maxAttempts,
      intervalSeconds: config.retry?.intervalSeconds,
      backoffRate: config.retry?.backoffRate,
    })(target, propertyKey as string, descriptor);
  };
}

/**
 * Декоратор для связывания компенсации с шагом.
 *
 * @example
 * @SagaStep({ name: "createStore", critical: true })
 * @Compensate("deleteStore")
 * async createStore(ctx: SagaContext<StoreInput>): Promise<string> { ... }
 *
 * @SagaCompensation({ name: "deleteStore" })
 * async deleteStore(ctx: SagaContext<StoreInput>, storeId: string): Promise<void> { ... }
 */
export function Compensate(
  compensationMethod: string,
  config?: CompensateConfig
): MethodDecorator {
  return function(target, propertyKey, descriptor) {
    Reflect.defineMetadata(SAGA_COMPENSATE_KEY, {
      compensateMethod: compensationMethod,
      compensateConfig: config,
    }, target, propertyKey);
    return descriptor;
  };
}

/**
 * Декоратор для компенсационного метода.
 */
export function SagaCompensation(config?: CompensateConfig): MethodDecorator {
  return function(target, propertyKey, descriptor) {
    // Wrap with DBOS.step with aggressive retry for compensations
    return DBOS.step({
      retriesAllowed: true,
      maxAttempts: config?.retry?.maxAttempts ?? 10,
      intervalSeconds: config?.retry?.intervalSeconds ?? 1,
      backoffRate: config?.retry?.backoffRate ?? 2,
    })(target, propertyKey as string, descriptor);
  };
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
 */
export class SagaContextManager<TInput = unknown> {
  private context: SagaContext<TInput>;

  constructor(sagaId: string, input: TInput) {
    this.context = {
      sagaId,
      input,
      status: "pending",
      stepResults: new Map(),
      completedSteps: [],
    };
  }

  /** Получить текущий контекст (immutable snapshot) */
  getContext(): Readonly<SagaContext<TInput>> {
    return { ...this.context };
  }

  /** Получить входные данные */
  getInput(): TInput {
    return this.context.input;
  }

  /** Получить результат конкретного шага */
  getStepResult<T>(stepName: string): T | undefined {
    return this.context.stepResults.get(stepName)?.data as T | undefined;
  }

  /** Установить статус */
  setStatus(status: SagaStatus): void {
    this.context.status = status;
  }

  /** Записать успешный результат шага */
  recordSuccess<T>(stepName: string, data: T): void {
    this.context.stepResults.set(stepName, { success: true, data });
    this.context.completedSteps.push(stepName);
  }

  /** Записать ошибку шага */
  recordFailure(stepName: string, error: Error): void {
    this.context.stepResults.set(stepName, { success: false, error });
    this.context.failedStep = stepName;
    this.context.failureError = error;
  }

  /** Получить шаги для компенсации (в обратном порядке) */
  getStepsToCompensate(): string[] {
    return [...this.context.completedSteps].reverse();
  }

  /** Удалить шаг из списка завершённых (после компенсации) */
  markCompensated(stepName: string): void {
    const index = this.context.completedSteps.indexOf(stepName);
    if (index > -1) {
      this.context.completedSteps.splice(index, 1);
    }
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
 */
export class SagaExecutor<TInput, TOutput> {
  private readonly logger = new Logger(SagaExecutor.name);

  constructor(
    private readonly sagaInstance: BrokerSaga<TInput, TOutput>,
    private readonly steps: SagaStepDefinition[],
    private readonly compensations: Map<string, CompensationDefinition>,
  ) {}

  /**
   * Выполняет сагу с автоматической компенсацией при ошибках.
   */
  async execute(
    sagaId: string,
    input: TInput,
  ): Promise<SagaResult<TOutput>> {
    const ctx = new SagaContextManager<TInput>(sagaId, input);
    ctx.setStatus("running");

    const compensationErrors: Error[] = [];
    let output: TOutput | undefined;

    try {
      // Execute steps sequentially
      for (const step of this.steps) {
        this.logger.debug(`Executing step: ${step.config.name}`);

        try {
          const result = await this.executeStep(step, ctx);
          ctx.recordSuccess(step.config.name, result);
        } catch (error) {
          ctx.recordFailure(step.config.name, error as Error);

          if (step.config.critical !== false) {
            throw error; // Trigger compensation
          }

          this.logger.warn(
            `Non-critical step ${step.config.name} failed, continuing`,
            error,
          );
        }
      }

      // All steps completed - build output
      output = await this.sagaInstance.buildOutput(ctx);
      ctx.setStatus("completed");

      return {
        success: true,
        data: output,
        compensated: false,
        compensationErrors: [],
      };

    } catch (error) {
      this.logger.error(`Saga failed at step ${ctx.getContext().failedStep}`, error);
      ctx.setStatus("compensating");

      // Run compensations in reverse order
      const stepsToCompensate = ctx.getStepsToCompensate();

      for (const stepName of stepsToCompensate) {
        const compensation = this.compensations.get(stepName);
        if (!compensation) {
          this.logger.warn(`No compensation defined for step: ${stepName}`);
          continue;
        }

        try {
          this.logger.debug(`Running compensation: ${compensation.config.name}`);
          const stepResult = ctx.getStepResult(stepName);
          await this.executeCompensation(compensation, ctx, stepResult);
          ctx.markCompensated(stepName);
        } catch (compError) {
          this.logger.error(
            `Compensation ${compensation.config.name} failed`,
            compError,
          );
          compensationErrors.push(compError as Error);
        }
      }

      ctx.setStatus(compensationErrors.length > 0 ? "failed" : "compensated");

      return {
        success: false,
        error: error as Error,
        compensated: compensationErrors.length === 0,
        compensationErrors,
      };
    }
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

  private async executeCompensation(
    compensation: CompensationDefinition,
    ctx: SagaContextManager<TInput>,
    stepResult: unknown,
  ): Promise<void> {
    const method = (this.sagaInstance as any)[compensation.method];
    await method.call(this.sagaInstance, ctx, stepResult);
  }

  private timeout(ms: number, stepName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Step ${stepName} timed out after ${ms}ms`));
      }, ms);
    });
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

  constructor(protected readonly broker: ServiceBroker) {
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
    const steps = this.collectSteps();
    const compensations = this.collectCompensations();

    this.executor = new SagaExecutor<TInput, TOutput>(
      this,
      steps,
      compensations,
    );
  }

  /**
   * Собирает шаги из декораторов @SagaStep.
   */
  private collectSteps(): SagaStepDefinition[] {
    const stepsMetadata = Reflect.getMetadata(SAGA_STEP_KEY, this) || [];
    return stepsMetadata
      .sort((a: any, b: any) => a.metadata.order - b.metadata.order)
      .map((s: any) => ({
        method: s.method,
        config: s.metadata.stepConfig,
      }));
  }

  /**
   * Собирает компенсации из декораторов @Compensate.
   */
  private collectCompensations(): Map<string, CompensationDefinition> {
    const compensations = new Map<string, CompensationDefinition>();
    const prototype = Object.getPrototypeOf(this);

    for (const methodName of Object.getOwnPropertyNames(prototype)) {
      const compMeta = Reflect.getMetadata(
        SAGA_COMPENSATE_KEY,
        prototype,
        methodName,
      );

      if (compMeta) {
        // Находим шаг по имени метода
        const stepsMetadata = Reflect.getMetadata(SAGA_STEP_KEY, this) || [];
        const step = stepsMetadata.find((s: any) => s.method === methodName);

        if (step) {
          compensations.set(step.metadata.stepConfig.name, {
            method: compMeta.compensateMethod,
            config: compMeta.compensateConfig || { name: compMeta.compensateMethod },
          });
        }
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

  // ─────────────────────────────────────────────────────────────
  // Step 1: Generate Store ID
  // ─────────────────────────────────────────────────────────────

  @SagaStep({ name: "generateStoreId", critical: true })
  async generateStoreId(ctx: SagaContextManager<StoreCreateInput>): Promise<string> {
    return uuidv7();
  }
  // No compensation needed - ID generation has no side effects

  // ─────────────────────────────────────────────────────────────
  // Step 2: Create Store in Database
  // ─────────────────────────────────────────────────────────────

  @SagaStep({ name: "createStore", critical: true })
  @Compensate("deleteStore")
  async createStore(ctx: SagaContextManager<StoreCreateInput>): Promise<void> {
    const input = ctx.getInput();
    const storeId = ctx.getStepResult<string>("generateStoreId")!;

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

  @SagaCompensation({ name: "deleteStore" })
  async deleteStore(ctx: SagaContextManager<StoreCreateInput>): Promise<void> {
    const storeId = ctx.getStepResult<string>("generateStoreId");
    if (storeId) {
      await this.kernel.repository.store.delete(storeId);
      this.logger.info({ storeId }, "Compensated: deleted store");
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Step 3: Create Store Roles via IAM Service
  // ─────────────────────────────────────────────────────────────

  @SagaStep({
    name: "createRoles",
    critical: true,
    retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
  })
  @Compensate("deleteRoles")
  async createRoles(ctx: SagaContextManager<StoreCreateInput>): Promise<void> {
    const input = ctx.getInput();
    const storeId = ctx.getStepResult<string>("generateStoreId")!;

    const result = await this.broker.call<IAM.CreateRolesResult>(
      "iam.createRoles",
      {
        userId: input.userId,
        organizationId: input.organizationId,
        domain: `store:${storeId}`,
        roles: buildStoreRoles(),
      },
    );

    if (!result.success) {
      throw new Error(result.error || "Failed to create store roles");
    }
  }

  @SagaCompensation({ name: "deleteRoles" })
  async deleteRoles(ctx: SagaContextManager<StoreCreateInput>): Promise<void> {
    const input = ctx.getInput();
    const storeId = ctx.getStepResult<string>("generateStoreId");

    if (storeId) {
      await this.broker.call("iam.deleteRoles", {
        organizationId: input.organizationId,
        domain: `store:${storeId}`,
      });
      this.logger.info({ storeId }, "Compensated: deleted roles");
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Step 4: Assign Admin Role to Creator
  // ─────────────────────────────────────────────────────────────

  @SagaStep({
    name: "assignAdminRole",
    critical: true,
    retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
  })
  @Compensate("unassignAdminRole")
  async assignAdminRole(ctx: SagaContextManager<StoreCreateInput>): Promise<void> {
    const input = ctx.getInput();
    const storeId = ctx.getStepResult<string>("generateStoreId")!;

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

  @SagaCompensation({ name: "unassignAdminRole" })
  async unassignAdminRole(ctx: SagaContextManager<StoreCreateInput>): Promise<void> {
    const input = ctx.getInput();
    const storeId = ctx.getStepResult<string>("generateStoreId");

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

  // ─────────────────────────────────────────────────────────────
  // Step 5: Create Media Asset Group (non-critical)
  // ─────────────────────────────────────────────────────────────

  @SagaStep({
    name: "createMediaAssetGroup",
    critical: false, // Продолжаем даже если media не доступен
    timeout: 5000,
  })
  @Compensate("deleteMediaAssetGroup")
  async createMediaAssetGroup(ctx: SagaContextManager<StoreCreateInput>): Promise<void> {
    const storeId = ctx.getStepResult<string>("generateStoreId")!;

    await this.broker.call<Media.CreateAssetGroupResult>(
      "media.createAssetGroup",
      { ownerType: "store", ownerId: storeId },
    );
  }

  @SagaCompensation({ name: "deleteMediaAssetGroup" })
  async deleteMediaAssetGroup(ctx: SagaContextManager<StoreCreateInput>): Promise<void> {
    const storeId = ctx.getStepResult<string>("generateStoreId");

    if (storeId) {
      try {
        await this.broker.call("media.deleteAssetGroup", {
          ownerType: "store",
          ownerId: storeId,
        });
        this.logger.info({ storeId }, "Compensated: deleted media asset group");
      } catch (error) {
        this.logger.warn({ storeId, error }, "Failed to delete media asset group during compensation");
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Output Builder
  // ─────────────────────────────────────────────────────────────

  buildOutput(ctx: SagaContextManager<StoreCreateInput>): StoreCreateOutput {
    return {
      storeId: ctx.getStepResult<string>("generateStoreId")!,
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
├── types.ts                 # Типы и интерфейсы
├── decorators.ts            # @Saga, @SagaStep, @Compensate, @SagaCompensation
├── SagaContext.ts           # SagaContextManager
├── SagaExecutor.ts          # Движок выполнения
└── BrokerSaga.ts            # Базовый класс
```

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
