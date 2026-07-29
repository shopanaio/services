import {
  COMMERCE_FUNCTION_CAPABILITY,
  type Apps,
  type CommerceFunctionInvocation,
  type CommerceFunctionJsonValue,
} from "@shopana/broker-types";
import {
  AuthorizationError,
  type ServiceBroker,
} from "@shopana/shared-kernel";
import type {
  AppExecutionPlanItem,
  FunctionErrorClass,
  FunctionImplementationTrace,
} from "./contracts.js";
import type {
  FunctionExecutionContext,
  FunctionExecutionOutcome,
  FunctionImplementationExecutor,
} from "./FunctionImplementation.js";
import {
  DEFAULT_MAX_ENVELOPE_DEPTH,
} from "./execution-policy.js";
import {
  FunctionEnvelopeError,
} from "./errors.js";
import { canonicalizeEnvelope, measureEnvelope } from "./trace.js";

export class BrokerFunctionExecutor
  implements FunctionImplementationExecutor
{
  constructor(private readonly broker: ServiceBroker) {}

  async execute<TInput>(
    context: FunctionExecutionContext<TInput>,
  ): Promise<FunctionExecutionOutcome> {
    const startedMs = Date.now();
    const startedAt = new Date(startedMs).toISOString();
    const deadlineMs = Date.parse(context.deadlineAt);
    let inputEnvelope: CommerceFunctionInvocation;
    let inputMeasurement;
    try {
      inputEnvelope = invocationEnvelope(context);
      inputMeasurement = measureEnvelope(
        inputEnvelope,
        context.definition.maxInputBytes,
        context.definition.maxEnvelopeDepth ??
          DEFAULT_MAX_ENVELOPE_DEPTH,
        "input",
      );
    } catch (error) {
      return failure(
        context,
        startedAt,
        startedMs,
        "IMPLEMENTATION_EXCEPTION",
        error instanceof FunctionEnvelopeError
          ? error.code
          : "FUNCTION_INPUT_INVALID",
        0,
      );
    }

    if (
      context.item.implementationType === "APP" &&
      context.item.unavailableCode === "DISCOVERY_DEADLINE_EXCEEDED"
    ) {
      return failure(
        context,
        startedAt,
        startedMs,
        "DEADLINE_EXCEEDED",
        context.item.unavailableCode,
        inputMeasurement.bytes,
        inputMeasurement.digest,
      );
    }
    if (context.item.implementationType === "APP") {
      if (context.item.unavailableCode) {
        return failure(
          context,
          startedAt,
          startedMs,
          "ROUTE_UNAVAILABLE",
          context.item.unavailableCode,
          inputMeasurement.bytes,
          inputMeasurement.digest,
        );
      }
    }
    if (!Number.isFinite(deadlineMs) || deadlineMs <= startedMs) {
      return failure(
        context,
        startedAt,
        startedMs,
        "DEADLINE_EXCEEDED",
        "FUNCTION_DEADLINE_EXCEEDED",
        inputMeasurement.bytes,
        inputMeasurement.digest,
      );
    }

    let actualRoute: InvocationResult["actualRoute"];
    try {
      const invocation = this.invoke(context, inputEnvelope);
      const result = await untilDeadline(invocation, deadlineMs);
      actualRoute = result.actualRoute;
      const outputData = canonicalizeEnvelope(
        result.data,
        context.definition.maxEnvelopeDepth ??
          DEFAULT_MAX_ENVELOPE_DEPTH,
        "output",
      );
      const output = measureEnvelope(
        outputData,
        context.definition.maxOutputBytes,
        context.definition.maxEnvelopeDepth ??
          DEFAULT_MAX_ENVELOPE_DEPTH,
        "output",
      );
      const endedMs = Date.now();
      if (endedMs >= deadlineMs) {
        return failure(
          context,
          startedAt,
          startedMs,
          "DEADLINE_EXCEEDED",
          "FUNCTION_DEADLINE_EXCEEDED",
          inputMeasurement.bytes,
          inputMeasurement.digest,
          actualRoute,
        );
      }
      return {
        ok: true,
        data: outputData,
        trace: Object.freeze({
          ...baseTrace(
            context,
            startedAt,
            startedMs,
            endedMs,
            inputMeasurement.bytes,
            inputMeasurement.digest,
          ),
          ...(actualRoute ?? {}),
          status: "SUCCEEDED",
          outputBytes: output.bytes,
          ...(context.definition.tracePolicy?.outputDigest
            ? { outputDigest: output.digest }
            : {}),
          deadlineExceeded: false,
        }),
      };
    } catch (error) {
      const classified = classifyError(error);
      return failure(
        context,
        startedAt,
        startedMs,
        classified.errorClass,
        classified.code,
        inputMeasurement.bytes,
        inputMeasurement.digest,
        actualRoute ?? routeFromError(error),
      );
    }
  }

  private async invoke<TInput>(
    context: FunctionExecutionContext<TInput>,
    envelope: CommerceFunctionInvocation,
  ): Promise<InvocationResult> {
    if (context.item.implementationType === "NATIVE") {
      if (
        this.broker.getActionMetadata(
          context.item.nativeAction,
        )?.readOnly !== true
      ) {
        throw new NativeFunctionActionPolicyError(
          context.item.nativeAction,
        );
      }
      return {
        data: await this.broker.call(
          context.item.nativeAction,
          envelope,
        ),
      };
    }
    const item = context.item;
    const result = await this.broker.call<
      Apps.ExecuteCapabilityResult,
      Apps.ExecuteCapabilityParams
    >("apps.executeCapability", {
      storeId: context.storeId,
      capability: COMMERCE_FUNCTION_CAPABILITY,
      operation: context.target,
      installationId: item.installationId,
      functionKey: item.functionKey,
      executionId: context.executionId,
      functionBindingId: item.functionBindingId,
      deadlineAt: context.deadlineAt,
      configurationSnapshot: envelope.configurationSnapshot,
      input: envelope.input,
      correlationId: envelope.correlationId,
    });
    return {
      data: result.data,
      actualRoute: {
        installationId: result.installationId,
        capabilityRouteId: result.capabilityRouteId,
        appCode: result.appCode,
        appVersion: result.appVersion,
        routeRevision: result.routeRevision,
      },
    };
  }
}

interface InvocationResult {
  readonly data: unknown;
  readonly actualRoute?: Pick<
    FunctionImplementationTrace,
    | "installationId"
    | "capabilityRouteId"
    | "appCode"
    | "appVersion"
    | "routeRevision"
  >;
}

function invocationEnvelope<TInput>(
  context: FunctionExecutionContext<TInput>,
): CommerceFunctionInvocation {
  const maxDepth =
    context.definition.maxEnvelopeDepth ??
    DEFAULT_MAX_ENVELOPE_DEPTH;
  return {
    target: context.target,
    executionId: context.executionId,
    functionBindingId:
      context.item.functionBindingId ??
      context.item.implementationId,
    deadlineAt: context.deadlineAt,
    ...(context.correlationId
      ? { correlationId: context.correlationId }
      : {}),
    configurationSnapshot: canonicalizeEnvelope(
      context.item.configurationSnapshot,
      maxDepth,
      "input",
    ),
    input: canonicalizeEnvelope(
      context.input,
      maxDepth,
      "input",
    ) as CommerceFunctionJsonValue,
  };
}

async function untilDeadline<T>(
  promise: Promise<T>,
  deadlineMs: number,
): Promise<T> {
  const remaining = deadlineMs - Date.now();
  if (remaining <= 0) {
    throw new DeadlineExceededError();
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guarded = promise.then(
    (value) => ({ kind: "result" as const, value }),
    (error) => ({ kind: "error" as const, error }),
  );
  const timeout = new Promise<{ kind: "timeout" }>((resolve) => {
    timer = setTimeout(() => resolve({ kind: "timeout" }), remaining);
  });
  const settled = await Promise.race([guarded, timeout]);
  if (timer) clearTimeout(timer);
  if (settled.kind === "timeout") throw new DeadlineExceededError();
  if (settled.kind === "error") throw settled.error;
  return settled.value;
}

class DeadlineExceededError extends Error {
  constructor() {
    super("Commerce Function deadline exceeded");
    this.name = "DeadlineExceededError";
  }
}

class NativeFunctionActionPolicyError extends Error {
  readonly code = "FUNCTION_ACTION_NOT_READ_ONLY";

  constructor(readonly action: string) {
    super("Native Commerce Function action is not classified as read-only");
    this.name = "NativeFunctionActionPolicyError";
  }
}

function classifyError(error: unknown): {
  errorClass: FunctionErrorClass;
  code: string;
} {
  if (error instanceof DeadlineExceededError) {
    return {
      errorClass: "DEADLINE_EXCEEDED",
      code: "FUNCTION_DEADLINE_EXCEEDED",
    };
  }
  if (error instanceof NativeFunctionActionPolicyError) {
    return {
      errorClass: "AUTHORIZATION_ERROR",
      code: error.code,
    };
  }
  if (
    error instanceof FunctionEnvelopeError &&
    error.code === "FUNCTION_OUTPUT_SIZE_LIMIT"
  ) {
    return {
      errorClass: "OUTPUT_SIZE_LIMIT",
      code: error.code,
    };
  }
  if (error instanceof FunctionEnvelopeError) {
    return {
      errorClass: "INVALID_IMPLEMENTATION_OUTPUT",
      code: error.code,
    };
  }
  if (hasAuthorizationError(error)) {
    return {
      errorClass: "AUTHORIZATION_ERROR",
      code: "FUNCTION_AUTHORIZATION_ERROR",
    };
  }
  const stable = stableCapabilityFailure(error);
  if (stable) return stable;
  return {
    errorClass: "IMPLEMENTATION_EXCEPTION",
    code: "FUNCTION_IMPLEMENTATION_EXCEPTION",
  };
}

function hasAuthorizationError(
  error: unknown,
  depth = 0,
): boolean {
  if (depth > 8 || !error || typeof error !== "object") {
    return false;
  }
  const candidate = error as {
    readonly cause?: unknown;
  };
  return (
    error instanceof AuthorizationError ||
    hasAuthorizationError(candidate.cause, depth + 1)
  );
}

function stableCapabilityFailure(
  error: unknown,
): { errorClass: FunctionErrorClass; code: string } | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as {
    readonly errorClassification?: unknown;
    readonly errorCode?: unknown;
  };
  if (
    candidate.errorClassification === "APP_RUNTIME_UNAVAILABLE" &&
    candidate.errorCode === "APP_RUNTIME_UNAVAILABLE"
  ) {
    return {
      errorClass: "APP_RUNTIME_UNAVAILABLE",
      code: "APP_RUNTIME_UNAVAILABLE",
    };
  }
  if (
    candidate.errorClassification === "AUTHORIZATION_ERROR" &&
    (candidate.errorCode === "FUNCTION_AUTHORIZATION_ERROR" ||
      candidate.errorCode === "FUNCTION_ACTION_NOT_READ_ONLY")
  ) {
    return {
      errorClass: "AUTHORIZATION_ERROR",
      code: candidate.errorCode,
    };
  }
  if (
    candidate.errorClassification === "DEADLINE_EXCEEDED" &&
    candidate.errorCode === "FUNCTION_DEADLINE_EXCEEDED"
  ) {
    return {
      errorClass: "DEADLINE_EXCEEDED",
      code: "FUNCTION_DEADLINE_EXCEEDED",
    };
  }
  if (
    candidate.errorClassification === "ROUTE_UNAVAILABLE" &&
    (candidate.errorCode === "FUNCTION_ROUTE_UNAVAILABLE" ||
      candidate.errorCode === "FUNCTION_KEY_MISMATCH" ||
      candidate.errorCode === "FUNCTION_ROUTE_DISCOVERY_FAILED")
  ) {
    return {
      errorClass: "ROUTE_UNAVAILABLE",
      code: candidate.errorCode,
    };
  }
  if (
    candidate.errorClassification === "OUTPUT_SIZE_LIMIT" &&
    candidate.errorCode === "FUNCTION_OUTPUT_SIZE_LIMIT"
  ) {
    return {
      errorClass: "OUTPUT_SIZE_LIMIT",
      code: "FUNCTION_OUTPUT_SIZE_LIMIT",
    };
  }
  if (
    candidate.errorClassification === "INVALID_IMPLEMENTATION_OUTPUT" &&
    candidate.errorCode === "FUNCTION_OUTPUT_JSON_VALUE_REQUIRED"
  ) {
    return {
      errorClass: "INVALID_IMPLEMENTATION_OUTPUT",
      code: "FUNCTION_OUTPUT_JSON_VALUE_REQUIRED",
    };
  }
  if (
    candidate.errorClassification === "IMPLEMENTATION_EXCEPTION" &&
    candidate.errorCode === "FUNCTION_IMPLEMENTATION_EXCEPTION"
  ) {
    return {
      errorClass: "IMPLEMENTATION_EXCEPTION",
      code: "FUNCTION_IMPLEMENTATION_EXCEPTION",
    };
  }
  return undefined;
}

function failure<TInput>(
  context: FunctionExecutionContext<TInput>,
  startedAt: string,
  startedMs: number,
  errorClass: FunctionErrorClass,
  errorCode: string,
  inputBytes: number,
  inputDigest?: string,
  actualRoute?: InvocationResult["actualRoute"],
): FunctionExecutionOutcome {
  const endedMs = Date.now();
  return {
    ok: false,
    errorClass,
    trace: Object.freeze({
      ...baseTrace(
        context,
        startedAt,
        startedMs,
        endedMs,
        inputBytes,
        inputDigest,
      ),
      ...(actualRoute ?? {}),
      status:
        errorClass === "DEADLINE_EXCEEDED" ? "TIMED_OUT" : "FAILED",
      deadlineExceeded: errorClass === "DEADLINE_EXCEEDED",
      errorClass,
      errorCode,
    }),
  };
}

function routeFromError(
  error: unknown,
): InvocationResult["actualRoute"] | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as Record<string, unknown>;
  if (
    typeof candidate.installationId !== "string" ||
    typeof candidate.capabilityRouteId !== "string" ||
    typeof candidate.appCode !== "string" ||
    typeof candidate.appVersion !== "string" ||
    typeof candidate.routeRevision !== "string"
  ) {
    return undefined;
  }
  return {
    installationId: candidate.installationId,
    capabilityRouteId: candidate.capabilityRouteId,
    appCode: candidate.appCode,
    appVersion: candidate.appVersion,
    routeRevision: candidate.routeRevision,
  };
}

function baseTrace<TInput>(
  context: FunctionExecutionContext<TInput>,
  startedAt: string,
  startedMs: number,
  endedMs: number,
  inputBytes: number,
  inputDigest?: string,
): Omit<
  FunctionImplementationTrace,
  "status" | "deadlineExceeded"
> {
  const item = context.item;
  return {
    planIndex: context.planIndex,
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
                plannedCapabilityRouteId:
                  item.capabilityRouteId,
              }
            : {}),
          ...(item.appCode
            ? { plannedAppCode: item.appCode }
            : {}),
          ...(item.appVersion
            ? { plannedAppVersion: item.appVersion }
            : {}),
          ...(item.routeRevision
            ? { plannedRouteRevision: item.routeRevision }
            : {}),
        }),
    configurationRevision: item.configurationRevision,
    precedence: item.precedence,
    activationSequence: item.activationSequence,
    failureMode: item.failureMode,
    startedAt,
    endedAt: new Date(endedMs).toISOString(),
    durationMs: Math.max(0, endedMs - startedMs),
    inputBytes,
    ...(context.definition.tracePolicy?.inputDigest && inputDigest
      ? { inputDigest }
      : {}),
  };
}
