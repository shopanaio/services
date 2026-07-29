import { describe, expect, it } from "@jest/globals";
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
});

function createActions(output: unknown): AppsPlatformActions {
  const installations = {
    resolveActiveStoreCapabilityRouteForInstallation: async () => ({
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
    }),
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
