export type CommerceFunctionTarget = string;
export type FunctionExecutionMode = "COLLECT_ALL" | "SINGLE";
export type FunctionFailureMode = "REQUIRED" | "OPTIONAL" | "DISABLED";
export type FunctionImplementationType = "NATIVE" | "APP";

export type FunctionErrorClass =
  | "ROUTE_UNAVAILABLE"
  | "DEADLINE_EXCEEDED"
  | "APP_RUNTIME_UNAVAILABLE"
  | "AUTHORIZATION_ERROR"
  | "IMPLEMENTATION_EXCEPTION"
  | "INVALID_IMPLEMENTATION_OUTPUT"
  | "OUTPUT_SIZE_LIMIT"
  | "DOMAIN_REJECTION";

export interface CommerceFunctionOwnerRef {
  readonly service: string;
  readonly resourceType: string;
  readonly resourceId: string;
}

export interface CommerceFunctionBindingRef {
  readonly functionBindingId: string;
  readonly installationId: string;
  readonly functionKey: string;
  readonly owner: CommerceFunctionOwnerRef;
  readonly configurationRevision: string;
  readonly configurationSnapshot: unknown;
  readonly routeRevision: string;
  readonly precedence: number;
  readonly activationSequence: number;
  readonly failureMode?: FunctionFailureMode;
}

export interface NativeFunctionImplementation {
  readonly implementationId: string;
  readonly action: string;
  readonly precedence?: number;
  readonly activationSequence?: number;
  readonly failureMode?: FunctionFailureMode;
}

export interface FunctionTracePolicy {
  readonly inputDigest?: boolean;
  readonly outputDigest?: boolean;
}

export interface FunctionTargetDefinition {
  readonly target: CommerceFunctionTarget;
  readonly owningService: string;
  readonly executionMode: FunctionExecutionMode;
  readonly nativeImplementations?: readonly NativeFunctionImplementation[];
  readonly defaultTimeoutMs: number;
  readonly concurrencyLimit: number;
  readonly appFailureMode: FunctionFailureMode;
  readonly allowMultipleAppImplementations: boolean;
  readonly maxInputBytes: number;
  readonly maxOutputBytes: number;
  readonly maxEnvelopeDepth?: number;
  readonly tracePolicy?: FunctionTracePolicy;
}

export interface CommerceFunctionRunRequest<TInput = unknown> {
  readonly storeId: string;
  readonly target: CommerceFunctionTarget;
  readonly bindings: readonly CommerceFunctionBindingRef[];
  readonly bindingSetRevision: string;
  readonly input: TInput;
  readonly executionId: string;
  readonly correlationId?: string;
  readonly deadlineAt?: string;
}

export interface NativeExecutionPlanItem {
  readonly implementationType: "NATIVE";
  readonly implementationId: string;
  readonly nativeAction: string;
  readonly functionBindingId: null;
  readonly owner: CommerceFunctionOwnerRef;
  readonly configurationRevision: null;
  readonly configurationSnapshot: null;
  readonly precedence: number;
  readonly activationSequence: number;
  readonly failureMode: FunctionFailureMode;
}

export interface AppExecutionPlanItem {
  readonly implementationType: "APP";
  readonly implementationId: string;
  readonly functionBindingId: string;
  readonly functionKey: string;
  readonly owner: CommerceFunctionOwnerRef;
  readonly configurationRevision: string;
  readonly configurationSnapshot: unknown;
  readonly configurationSnapshotDigest: string;
  readonly precedence: number;
  readonly activationSequence: number;
  readonly failureMode: FunctionFailureMode;
  readonly installationId: string;
  readonly capabilityRouteId: string | null;
  readonly appCode: string | null;
  readonly appVersion: string | null;
  readonly routeRevision: string | null;
  readonly unavailableCode?:
    | "ROUTE_NOT_FOUND"
    | "FUNCTION_KEY_MISMATCH"
    | "ROUTE_REVISION_MISMATCH"
    | "ROUTE_DISCOVERY_FAILED"
    | "DISCOVERY_DEADLINE_EXCEEDED";
}

export type FunctionExecutionPlanItem =
  | NativeExecutionPlanItem
  | AppExecutionPlanItem;

export interface CommerceFunctionExecutionPlan {
  readonly revision: string;
  readonly target: CommerceFunctionTarget;
  readonly storeId: string;
  readonly owningService: string;
  readonly executionId: string;
  readonly correlationId?: string;
  readonly bindingSetRevision: string;
  readonly deadlineAt: string;
  readonly mode: FunctionExecutionMode;
  readonly items: readonly FunctionExecutionPlanItem[];
}

export interface FunctionImplementationOutput<TOutput = unknown> {
  readonly planIndex: number;
  readonly implementationId: string;
  readonly implementationType: FunctionImplementationType;
  readonly functionBindingId: string | null;
  readonly data: TOutput;
}

export type FunctionImplementationStatus =
  | "SUCCEEDED"
  | "FAILED"
  | "TIMED_OUT"
  | "SKIPPED";

export interface FunctionImplementationTrace {
  readonly planIndex: number;
  readonly implementationId: string;
  readonly implementationType: FunctionImplementationType;
  readonly functionBindingId: string | null;
  readonly owner: CommerceFunctionOwnerRef;
  readonly nativeAction?: string;
  readonly installationId?: string;
  /** Route metadata captured in the immutable execution plan. */
  readonly plannedCapabilityRouteId?: string;
  readonly plannedAppCode?: string;
  readonly plannedAppVersion?: string;
  readonly plannedRouteRevision?: string;
  /** Route metadata confirmed by Apps service at invocation time. */
  readonly capabilityRouteId?: string;
  readonly appCode?: string;
  readonly appVersion?: string;
  readonly routeRevision?: string;
  readonly configurationRevision: string | null;
  readonly precedence: number;
  readonly activationSequence: number;
  readonly failureMode: FunctionFailureMode;
  readonly status: FunctionImplementationStatus;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly durationMs: number;
  readonly inputBytes: number;
  readonly outputBytes?: number;
  readonly inputDigest?: string;
  readonly outputDigest?: string;
  readonly deadlineExceeded: boolean;
  readonly errorClass?: FunctionErrorClass;
  readonly errorCode?: string;
}

export interface CommerceFunctionExecutionTrace {
  readonly executionId: string;
  readonly correlationId?: string;
  readonly target: CommerceFunctionTarget;
  readonly storeId: string;
  readonly owningService: string;
  readonly planRevision: string;
  readonly bindingSetRevision: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly durationMs: number;
  readonly deadlineAt: string;
  readonly status: "SUCCEEDED" | "PARTIAL" | "FAILED";
  readonly implementations: readonly FunctionImplementationTrace[];
}

export interface CommerceFunctionRunResult<TOutput = unknown> {
  readonly target: CommerceFunctionTarget;
  readonly outputs: readonly FunctionImplementationOutput<TOutput>[];
  readonly trace: CommerceFunctionExecutionTrace;
}
