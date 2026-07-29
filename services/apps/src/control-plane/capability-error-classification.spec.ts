import { describe, expect, it } from "@jest/globals";
import { AuthorizationError } from "@shopana/shared-kernel";
import {
  AppOutboundAuthorizationError,
} from "../runtime/AppOutboundAuthorizationError.js";
import { AppRuntimeInvocationError } from "../runtime/AppRuntimeInvocationError.js";
import {
  CapabilityInvocationError,
  CommerceFunctionOutputError,
  capabilityErrorDescriptor,
} from "./capability-error-classification.js";

describe("capabilityErrorDescriptor", () => {
  it("preserves authorization classification through nested causes", () => {
    const authorization = new AuthorizationError(
      [],
      "org.stores",
      "read",
    );
    const wrapped = new Error("Capability invocation failed", {
      cause: authorization,
    });

    expect(capabilityErrorDescriptor(wrapped)).toEqual({
      classification: "AUTHORIZATION_ERROR",
      code: "FUNCTION_AUTHORIZATION_ERROR",
    });
  });

  it("classifies Commerce Function outbound policy denials as authorization errors", () => {
    expect(
      capabilityErrorDescriptor(
        new AppOutboundAuthorizationError(
          "Commerce Function cannot call a mutating action",
        ),
      ),
    ).toEqual({
      classification: "AUTHORIZATION_ERROR",
      code: "FUNCTION_AUTHORIZATION_ERROR",
    });
  });

  it("uses stable runtime codes without inspecting messages", () => {
    expect(
      capabilityErrorDescriptor(
        new AppRuntimeInvocationError("APP_RUNTIME_UNAVAILABLE"),
      ),
    ).toEqual({
      classification: "APP_RUNTIME_UNAVAILABLE",
      code: "APP_RUNTIME_UNAVAILABLE",
    });
    expect(
      capabilityErrorDescriptor(
        new AppRuntimeInvocationError("APP_ROUTE_UNAVAILABLE"),
      ),
    ).toEqual({
      classification: "ROUTE_UNAVAILABLE",
      code: "FUNCTION_ROUTE_UNAVAILABLE",
    });
    expect(
      capabilityErrorDescriptor(
        new AppRuntimeInvocationError("APP_ACTION_NOT_READ_ONLY"),
      ),
    ).toEqual({
      classification: "AUTHORIZATION_ERROR",
      code: "FUNCTION_ACTION_NOT_READ_ONLY",
    });
    expect(
      capabilityErrorDescriptor(
        new Error("scope runtime not ready deadline"),
      ),
    ).toEqual({
      classification: "IMPLEMENTATION_EXCEPTION",
      code: "FUNCTION_IMPLEMENTATION_EXCEPTION",
    });
  });

  it("uses stable Commerce Function output classifications", () => {
    expect(
      capabilityErrorDescriptor(
        new CommerceFunctionOutputError(
          "FUNCTION_OUTPUT_JSON_VALUE_REQUIRED",
        ),
      ),
    ).toEqual({
      classification: "INVALID_IMPLEMENTATION_OUTPUT",
      code: "FUNCTION_OUTPUT_JSON_VALUE_REQUIRED",
    });
    expect(
      capabilityErrorDescriptor(
        new CommerceFunctionOutputError(
          "FUNCTION_OUTPUT_SIZE_LIMIT",
        ),
      ),
    ).toEqual({
      classification: "OUTPUT_SIZE_LIMIT",
      code: "FUNCTION_OUTPUT_SIZE_LIMIT",
    });
  });

  it("does not expose the original implementation message", () => {
    const cause = new Error(
      "postgres://user:password@internal-host",
    );
    const wrapped = new CapabilityInvocationError(cause);

    expect(wrapped.message).toBe("App capability invocation failed");
    expect(wrapped.message).not.toContain("password");
    expect(wrapped.cause).toBe(cause);
    expect(wrapped.errorCode).toBe(
      "FUNCTION_IMPLEMENTATION_EXCEPTION",
    );
  });
});
