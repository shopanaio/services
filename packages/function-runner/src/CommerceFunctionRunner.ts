import type {
  CommerceFunctionExecutionTrace,
  CommerceFunctionRunRequest,
  CommerceFunctionRunResult,
  FunctionImplementationOutput,
  FunctionExecutionPlanItem,
  FunctionTargetDefinition,
} from "./contracts.js";
import { CommerceFunctionExecutionError } from "./errors.js";
import type {
  FunctionExecutionOutcome,
  FunctionImplementationExecutor,
} from "./FunctionImplementation.js";
import { FunctionRouteResolver } from "./FunctionRouteResolver.js";
import { FunctionTargetRegistry } from "./FunctionTargetRegistry.js";
import { DEFAULT_MAX_ENVELOPE_DEPTH } from "./execution-policy.js";
import { canonicalizeEnvelope, cloneAndFreeze, measureEnvelope } from "./trace.js";

export class CommerceFunctionRunner {
  constructor(
    private readonly registry: FunctionTargetRegistry,
    private readonly routes: FunctionRouteResolver,
    private readonly executor: FunctionImplementationExecutor,
  ) {}

  async run<TInput = unknown, TOutput = unknown>(
    request: CommerceFunctionRunRequest<TInput>,
  ): Promise<CommerceFunctionRunResult<TOutput>> {
    const definition = this.registry.get(request.target);
    assertRequest(request);

    // Capture all caller-owned values before the first asynchronous boundary.
    const maxDepth = definition.maxEnvelopeDepth ?? DEFAULT_MAX_ENVELOPE_DEPTH;
    const enabledBindings = request.bindings.filter(
      (binding) => (binding.failureMode ?? definition.appFailureMode) !== "DISABLED",
    );
    const snapshot = cloneAndFreeze({
      ...request,
      input: canonicalizeEnvelope(request.input, maxDepth, "input"),
      bindings: enabledBindings.map((binding) => ({
        ...binding,
        configurationSnapshot: canonicalizeEnvelope(
          binding.configurationSnapshot ?? null,
          maxDepth,
          "input",
        ),
      })),
    });
    measureEnvelope(snapshot.input, definition.maxInputBytes, maxDepth, "input");

    const startedMs = Date.now();
    const startedAt = new Date(startedMs).toISOString();
    const plan = await this.routes.resolve(snapshot, definition, startedMs);
    const scheduledOutcomes = await executeWithConcurrency(
      plan.items.length,
      definition.concurrencyLimit,
      (planIndex) =>
        this.executor.execute({
          planIndex,
          target: plan.target,
          storeId: plan.storeId,
          executionId: plan.executionId,
          correlationId: plan.correlationId,
          deadlineAt: plan.deadlineAt,
          input: snapshot.input,
          item: plan.items[planIndex]!,
          definition,
        }),
      (outcome) => outcome.ok === false && outcome.trace.failureMode === "REQUIRED",
    );
    const outcomes = scheduledOutcomes.map(
      (outcome, planIndex) => outcome ?? skippedOutcome(planIndex, plan.items[planIndex]!),
    );

    const endedMs = Date.now();
    const failures = outcomes.filter(
      (outcome): outcome is Extract<FunctionExecutionOutcome, { ok: false }> =>
        outcome.ok === false,
    );
    const requiredFailure = failures.find((failure) => failure.trace.failureMode === "REQUIRED");
    const trace: CommerceFunctionExecutionTrace = Object.freeze({
      executionId: plan.executionId,
      correlationId: plan.correlationId,
      target: plan.target,
      storeId: plan.storeId,
      owningService: plan.owningService,
      planRevision: plan.revision,
      bindingSetRevision: plan.bindingSetRevision,
      startedAt,
      endedAt: new Date(endedMs).toISOString(),
      durationMs: Math.max(0, endedMs - startedMs),
      deadlineAt: plan.deadlineAt,
      status: requiredFailure ? "FAILED" : failures.length > 0 ? "PARTIAL" : "SUCCEEDED",
      implementations: Object.freeze(outcomes.map((outcome) => outcome.trace)),
    });

    const outputs = outcomes.flatMap<FunctionImplementationOutput<TOutput>>((outcome) =>
      outcome.ok === true
        ? [
            Object.freeze({
              planIndex: outcome.trace.planIndex,
              implementationId: outcome.trace.implementationId,
              implementationType: outcome.trace.implementationType,
              functionBindingId: outcome.trace.functionBindingId,
              data: outcome.data as TOutput,
            }),
          ]
        : [],
    );
    const frozenOutputs = Object.freeze(outputs);
    if (requiredFailure) {
      throw new CommerceFunctionExecutionError<TOutput>(
        `Required implementation "${requiredFailure.trace.implementationId}" failed`,
        trace,
        requiredFailure.errorClass,
        frozenOutputs,
      );
    }

    return Object.freeze({
      target: plan.target,
      outputs: frozenOutputs,
      trace,
    });
  }
}

function assertRequest<TInput>(request: CommerceFunctionRunRequest<TInput>): void {
  if (
    !request.storeId.trim() ||
    !request.target.trim() ||
    !request.bindingSetRevision.trim() ||
    !request.executionId.trim()
  ) {
    throw new Error("storeId, target, bindingSetRevision and executionId are required");
  }
}

async function executeWithConcurrency<T>(
  count: number,
  concurrencyLimit: number,
  execute: (index: number) => Promise<T>,
  shouldStop: (result: T) => boolean,
): Promise<Array<T | undefined>> {
  if (count === 0) return [];
  const results = new Array<T | undefined>(count).fill(undefined);
  let nextIndex = 0;
  let stopped = false;
  const worker = async (): Promise<void> => {
    while (!stopped && nextIndex < count) {
      const index = nextIndex++;
      const result = await execute(index);
      results[index] = result;
      if (shouldStop(result)) {
        stopped = true;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(count, concurrencyLimit) }, () => worker()));
  return results;
}

function skippedOutcome(
  planIndex: number,
  item: FunctionExecutionPlanItem,
): FunctionExecutionOutcome {
  const timestamp = new Date().toISOString();
  return Object.freeze({
    ok: null,
    trace: Object.freeze({
      planIndex,
      implementationId: item.implementationId,
      implementationType: item.implementationType,
      functionBindingId: item.functionBindingId,
      owner: item.owner,
      ...(item.implementationType === "NATIVE"
        ? { nativeAction: item.nativeAction }
        : {
            installationId: item.installationId,
            ...(item.capabilityRouteId
              ? {
                  plannedCapabilityRouteId: item.capabilityRouteId,
                }
              : {}),
            ...(item.appCode ? { plannedAppCode: item.appCode } : {}),
            ...(item.appVersion ? { plannedAppVersion: item.appVersion } : {}),
            ...(item.routeRevision
              ? {
                  plannedRouteRevision: item.routeRevision,
                }
              : {}),
          }),
      configurationRevision: item.configurationRevision,
      precedence: item.precedence,
      activationSequence: item.activationSequence,
      failureMode: item.failureMode,
      status: "SKIPPED",
      startedAt: timestamp,
      endedAt: timestamp,
      durationMs: 0,
      inputBytes: 0,
      deadlineExceeded: false,
    }),
  });
}

export function createCommerceFunctionRunner(input: {
  readonly registry: FunctionTargetRegistry;
  readonly routes: FunctionRouteResolver;
  readonly executor: FunctionImplementationExecutor;
}): CommerceFunctionRunner {
  return new CommerceFunctionRunner(input.registry, input.routes, input.executor);
}

export type CommerceFunctionRunnerDependencies = {
  readonly registry: FunctionTargetRegistry;
  readonly routes: FunctionRouteResolver;
  readonly executor: FunctionImplementationExecutor;
};

export type RegisteredFunctionTarget = FunctionTargetDefinition;
