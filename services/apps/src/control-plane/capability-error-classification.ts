import { AuthorizationError } from "@shopana/shared-kernel";
import { AppOutboundAuthorizationError } from "../runtime/AppOutboundAuthorizationError.js";
import { AppRuntimeInvocationError } from "../runtime/AppRuntimeInvocationError.js";

export type CapabilityErrorClassification =
  | "APP_RUNTIME_UNAVAILABLE"
  | "AUTHORIZATION_ERROR"
  | "DEADLINE_EXCEEDED"
  | "IMPLEMENTATION_EXCEPTION"
  | "INVALID_IMPLEMENTATION_OUTPUT"
  | "OUTPUT_SIZE_LIMIT"
  | "ROUTE_UNAVAILABLE";

export interface CapabilityErrorDescriptor {
  readonly classification: CapabilityErrorClassification;
  readonly code:
    | "APP_RUNTIME_UNAVAILABLE"
    | "FUNCTION_ACTION_NOT_READ_ONLY"
    | "FUNCTION_AUTHORIZATION_ERROR"
    | "FUNCTION_DEADLINE_EXCEEDED"
    | "FUNCTION_IMPLEMENTATION_EXCEPTION"
    | "FUNCTION_KEY_MISMATCH"
    | "FUNCTION_OUTPUT_JSON_VALUE_REQUIRED"
    | "FUNCTION_OUTPUT_SIZE_LIMIT"
    | "FUNCTION_ROUTE_DISCOVERY_FAILED"
    | "FUNCTION_ROUTE_UNAVAILABLE";
}

export class CommerceFunctionOutputError extends Error {
  constructor(
    readonly code: "FUNCTION_OUTPUT_JSON_VALUE_REQUIRED" | "FUNCTION_OUTPUT_SIZE_LIMIT",
    cause?: unknown,
  ) {
    super(
      "Commerce Function output failed platform validation",
      cause === undefined ? {} : { cause },
    );
    this.name = "CommerceFunctionOutputError";
  }
}

export interface CapabilityInvocationRouteMetadata {
  readonly capabilityRouteId: string;
  readonly installationId: string;
  readonly appCode: string;
  readonly appVersion: string;
  readonly routeRevision: string;
}

export class CapabilityInvocationError extends Error {
  readonly capabilityRouteId?: string;
  readonly installationId?: string;
  readonly appCode?: string;
  readonly appVersion?: string;
  readonly routeRevision?: string;
  readonly errorClassification: CapabilityErrorClassification;
  readonly errorCode: CapabilityErrorDescriptor["code"];

  constructor(
    cause: unknown,
    route?: CapabilityInvocationRouteMetadata,
    descriptor = capabilityErrorDescriptor(cause),
  ) {
    super("App capability invocation failed", cause === undefined ? {} : { cause });
    this.name = "CapabilityInvocationError";
    if (route) {
      this.capabilityRouteId = route.capabilityRouteId;
      this.installationId = route.installationId;
      this.appCode = route.appCode;
      this.appVersion = route.appVersion;
      this.routeRevision = route.routeRevision;
    }
    this.errorClassification = descriptor.classification;
    this.errorCode = descriptor.code;
  }
}

export function capabilityErrorDescriptor(error: unknown): CapabilityErrorDescriptor {
  if (error instanceof CommerceFunctionOutputError) {
    return error.code === "FUNCTION_OUTPUT_SIZE_LIMIT"
      ? {
          classification: "OUTPUT_SIZE_LIMIT",
          code: error.code,
        }
      : {
          classification: "INVALID_IMPLEMENTATION_OUTPUT",
          code: error.code,
        };
  }
  if (hasAuthorizationError(error)) {
    return {
      classification: "AUTHORIZATION_ERROR",
      code: "FUNCTION_AUTHORIZATION_ERROR",
    };
  }
  if (error instanceof AppRuntimeInvocationError) {
    if (error.code === "APP_RUNTIME_UNAVAILABLE") {
      return {
        classification: "APP_RUNTIME_UNAVAILABLE",
        code: "APP_RUNTIME_UNAVAILABLE",
      };
    }
    if (error.code === "APP_ACTION_NOT_READ_ONLY") {
      return {
        classification: "AUTHORIZATION_ERROR",
        code: "FUNCTION_ACTION_NOT_READ_ONLY",
      };
    }
    return {
      classification: "ROUTE_UNAVAILABLE",
      code: "FUNCTION_ROUTE_UNAVAILABLE",
    };
  }
  return {
    classification: "IMPLEMENTATION_EXCEPTION",
    code: "FUNCTION_IMPLEMENTATION_EXCEPTION",
  };
}

function hasAuthorizationError(error: unknown, depth = 0): boolean {
  if (depth > 8 || !error || typeof error !== "object") {
    return false;
  }
  if (error instanceof AuthorizationError || error instanceof AppOutboundAuthorizationError) {
    return true;
  }
  return hasAuthorizationError((error as { cause?: unknown }).cause, depth + 1);
}
