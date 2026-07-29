import { describe, expect, it, jest } from "@jest/globals";
import {
  COMMERCE_FUNCTION_CAPABILITY,
  COMMERCE_FUNCTION_MAX_OUTPUT_BYTES,
  type Apps,
} from "@shopana/broker-types";
import type {
  BrokerCallContext,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { AppsRuntimeRouter } from "../runtime/AppsRuntimeRouter.js";
import { AppInstallationStore } from "./AppInstallationStore.js";
import { AppLifecycleService } from "./AppLifecycleService.js";
import { AppsPlatformActions } from "./AppsPlatformActions.js";
import { CapabilityInvocationError } from "./capability-error-classification.js";

describe("AppsPlatformActions Commerce Function output boundary", () => {
  it("rejects non-JSON output and preserves the invoked route", async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const actions = createActions(circular);

    await expect(
      actions.executeCapability(params(), context()),
    ).rejects.toMatchObject({
      errorClassification: "INVALID_IMPLEMENTATION_OUTPUT",
      errorCode: "FUNCTION_OUTPUT_JSON_VALUE_REQUIRED",
      capabilityRouteId: "route-1",
      appVersion: "1.0.0",
      routeRevision: "revision-1",
    } satisfies Partial<CapabilityInvocationError>);
  });

  it("rejects output above the global Apps ceiling", async () => {
    const actions = createActions(
      "x".repeat(COMMERCE_FUNCTION_MAX_OUTPUT_BYTES),
    );

    await expect(
      actions.executeCapability(params(), context()),
    ).rejects.toMatchObject({
      errorClassification: "OUTPUT_SIZE_LIMIT",
      errorCode: "FUNCTION_OUTPUT_SIZE_LIMIT",
      capabilityRouteId: "route-1",
    } satisfies Partial<CapabilityInvocationError>);
  });

  it("does not invoke an App when route resolution crosses the deadline", async () => {
    let now = 1_000;
    const nowSpy = jest
      .spyOn(Date, "now")
      .mockImplementation(() => now);
    const invoke = jest.fn(async () => ({ ok: true }));
    const installations = {
      resolveActiveStoreCapabilityRouteForInstallation: async () => {
        now = 2_000;
        return route();
      },
    } as unknown as AppInstallationStore;
    const actions = new AppsPlatformActions(
      {} as ServiceBroker,
      {} as AppLifecycleService,
      installations,
      { invoke } as unknown as AppsRuntimeRouter,
    );

    try {
      await expect(
        actions.executeCapability(
          {
            ...params(),
            deadlineAt: new Date(2_000).toISOString(),
          },
          context(),
        ),
      ).rejects.toMatchObject({
        errorClassification: "DEADLINE_EXCEEDED",
        errorCode: "FUNCTION_DEADLINE_EXCEEDED",
      } satisfies Partial<CapabilityInvocationError>);
      expect(invoke).not.toHaveBeenCalled();
    } finally {
      nowSpy.mockRestore();
    }
  });
});

function createActions(output: unknown): AppsPlatformActions {
  const installations = {
    resolveActiveStoreCapabilityRouteForInstallation: async () => route(),
  } as unknown as AppInstallationStore;
  const router = {
    invoke: async () => output,
  } as unknown as AppsRuntimeRouter;
  return new AppsPlatformActions(
    {} as ServiceBroker,
    {} as AppLifecycleService,
    installations,
    router,
  );
}

function route() {
  return {
    capabilityRouteId: "route-1",
    installationId: "installation-1",
    appCode: "function-test",
    appVersion: "1.0.0",
    organizationId: "organization-1",
    storeId: "store-1",
    capability: COMMERCE_FUNCTION_CAPABILITY,
    operation: "cart.transform.run",
    targetAction: "transform",
    routeRevision: "revision-1",
  };
}

function params(): Apps.ExecuteCapabilityParams {
  return {
    storeId: "store-1",
    capability: COMMERCE_FUNCTION_CAPABILITY,
    operation: "cart.transform.run",
    installationId: "installation-1",
    functionKey: "transform",
    executionId: "execution-1",
    functionBindingId: "binding-1",
    deadlineAt: new Date(Date.now() + 60_000).toISOString(),
    configurationSnapshot: {},
    input: {},
  };
}

function context(): BrokerCallContext {
  return {
    caller: {
      kind: "action",
      service: "pricing",
    },
  };
}
