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
  toOperationError,
  DEFAULT_STEP_TIMEOUT_MS,
  DEFAULT_COMPENSATION_RETRY,
} from "./types.js";

export const SAGA_DEFINITION_KEY = Symbol("saga:definition");
export const SAGA_STEP_KEY = Symbol("saga:step");

const logger = new Logger("SagaEngine");

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// @SagaStep DECORATOR
// ============================================================================

/**
 * @SagaStep() marks a method as a durable saga step.
 */
export function SagaStep(config: SagaStepConfig = {}): MethodDecorator {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value as Function;
    const methodName =
      typeof propertyKey === "symbol" ? propertyKey.toString() : propertyKey;
    const stepName = config.name ?? methodName;
    const timeoutMs = config.timeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;
    const isCritical = config.critical !== false;

    const existingSteps: SagaStepMetadata[] =
      Reflect.getMetadata(SAGA_STEP_KEY, target) || [];
    const metadata: SagaStepMetadata = {
      stepConfig: { ...config, name: stepName },
      methodName,
    };
    Reflect.defineMetadata(SAGA_STEP_KEY, [...existingSteps, metadata], target);

    const retryPolicy = config.retry ?? {
      maxAttempts: 1,
      intervalSeconds: 0,
      backoffRate: 1,
    };

    (descriptor as { value: (...args: unknown[]) => Promise<unknown> }).value =
      async function (...args: unknown[]) {
        const ctx = getSagaContext();

        type InternalStepResult<T> =
          | { kind: "ok"; data: T }
          | { kind: "nonRetryableFailure"; error: Error }
          | { kind: "timeout"; error: StepTimeoutError };

        let stepResult: InternalStepResult<unknown>;

        try {
          stepResult = await DBOS.runStep<InternalStepResult<unknown>>(
            async () => {
              try {
                const result = await withTimeout(
                  originalMethod.apply(this, args),
                  timeoutMs,
                  stepName,
                );

                return { kind: "ok", data: result };
              } catch (error) {
                if (error instanceof StepTimeoutError) {
                  return { kind: "timeout", error };
                }

                if (!isRetryableError(error)) {
                  return { kind: "nonRetryableFailure", error: error as Error };
                }

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
          const lastError = error as Error;
          logger.warn(`Step ${stepName} failed after retries exhausted`);

          if (!isCritical) {
            logger.warn(`Non-critical step ${stepName} failed, continuing saga`);
            return undefined;
          }

          throw new StepExecutionError(stepName, methodName, lastError);
        }

        if (
          stepResult.kind === "timeout" ||
          stepResult.kind === "nonRetryableFailure"
        ) {
          const failureError = stepResult.error;
          logger.debug(`Step ${stepName} failed with non-retryable error`);

          if (!isCritical) {
            logger.warn(`Non-critical step ${stepName} failed, continuing saga`);
            return undefined;
          }

          throw new StepExecutionError(stepName, methodName, failureError);
        }

        ctx.recordStep(methodName, stepName, args, { ...config, name: stepName });
        return stepResult.data;
      };

    return descriptor;
  };
}

// ============================================================================
// @Saga DECORATOR
// ============================================================================

/**
 * @Saga("name", config?) marks run() as the saga entry point.
 */
export function Saga(
  name: string,
  config?: SagaExecutorConfig,
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as Function;

    Reflect.defineMetadata(SAGA_DEFINITION_KEY, { name }, target.constructor);

    (descriptor as { value: (input: unknown) => Promise<SagaResult> }).value =
      async function (input: unknown): Promise<SagaResult> {
        const sagaId = DBOS.workflowID;
        if (!sagaId) {
          throw new Error("Saga must be executed within a DBOS workflow context");
        }
        const ctx = new SagaExecutionContext(sagaId);
        let compensationFailed = false;

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
              },
              "Compensation exhausted - manual intervention required",
            );
          });

        try {
          const result = await sagaContextStorage.run(ctx, async () => {
            return originalMethod.call(this, input);
          });

          return {
            success: true,
            status: "completed" as SagaStatus,
            data: result,
            compensated: false,
          };
        } catch (error) {
          const stepError = error instanceof StepExecutionError ? error : null;
          const failedMethod = stepError?.methodName ?? "unknown";
          const failedStepName = stepError?.stepName ?? "unknown";
          ctx.recordFailure(failedMethod);

          logger.error(
            `Saga ${name} failed at step ${failedStepName}, starting compensation`,
            error as Error,
          );

          const stepsToCompensate = ctx.getStepsToCompensate();

          for (const step of stepsToCompensate) {
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

            if (typeof (this as Record<string, unknown>)[compensateMethodName] !== "function") {
              logger.debug(
                `No compensation method "${compensateMethodName}" for step: ${step.method}, skipping`,
              );
              continue;
            }

            try {
              await executeCompensationWithRetry(
                this,
                step,
                compensateMethodName,
                compensationRetryPolicy,
              );
              logger.debug(`Compensated: ${step.method}`);
            } catch (compError) {
              await onCompensationExhausted(
                step.method,
                compensateMethodName,
                compError as Error,
                {
                  sagaId: ctx.sagaId,
                  args: step.args,
                },
              );
              compensationFailed = true;
            }
          }

          const status: SagaStatus = compensationFailed ? "failed" : "compensated";
          const originalError = stepError?.cause ?? (error as Error);

          return {
            success: false,
            status,
            error: toOperationError(originalError),
            failedStep: ctx.getFailedStep(),
            compensated: !compensationFailed,
          };
        }
      };

    const key =
      typeof propertyKey === "symbol" ? propertyKey.toString() : propertyKey;
    return DBOS.workflow()(target, key, descriptor);
  };
}

// ============================================================================
// COMPENSATION EXECUTOR
// ============================================================================

/**
 * Execute compensation with aggressive retry.
 */
async function executeCompensationWithRetry(
  instance: Record<string, (...args: unknown[]) => Promise<unknown>>,
  step: ExecutedStep,
  methodName: string,
  policy: RetryPolicy,
): Promise<void> {
  await DBOS.runStep(
    async () => {
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
