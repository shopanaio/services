import { describe, expect, it } from "@jest/globals";
import type {
  AppExecutionContext,
  AppInstallationContextProvider,
  AppManifest,
} from "@shopana/app-sdk";
import {
  ActionRegistry,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { AppBrokerFacadeFactory } from "./AppBrokerFacadeFactory.js";
import { AppContextRunner } from "./AppContextRunner.js";
import {
  AppOutboundAuthorizationError,
} from "./AppOutboundAuthorizationError.js";

describe("AppBrokerFacadeFactory Commerce Function policy", () => {
  it("allows explicitly read-only actions and blocks writes and workflows", async () => {
    const registry = new ActionRegistry();
    const appsBroker = new ServiceBroker(registry, {
      serviceName: "apps",
    });
    const catalogBroker = new ServiceBroker(registry, {
      serviceName: "catalog",
    });
    const paymentsBroker = new ServiceBroker(registry, {
      serviceName: "payments",
    });
    catalogBroker.register(
      "readSnapshot",
      async () => ({ version: 1 }),
      { readOnly: true },
    );
    catalogBroker.register("updateItem", async () => ({
      updated: true,
    }));
    paymentsBroker.register(
      "readInternalContract",
      async () => ({ secret: true }),
      { readOnly: true },
    );
    const contextRunner = new AppContextRunner();
    const facade = new AppBrokerFacadeFactory().create({
      appCode: "function-test",
      appVersion: "1.0.0",
      manifest: manifest(),
      broker: appsBroker,
      contextRunner,
      installations: {} as AppInstallationContextProvider,
    });
    const context: AppExecutionContext = {
      appCode: "function-test",
      installationId: "installation-1",
      organizationId: "organization-1",
      storeId: "store-1",
      appVersion: "1.0.0",
      grantedScopes: ["catalog"],
      executionKind: "COMMERCE_FUNCTION",
    };

    await expect(
      contextRunner.run(context, () =>
        facade.call("catalog.readSnapshot"),
      ),
    ).resolves.toEqual({ version: 1 });
    expect(() =>
      contextRunner.run(context, () =>
        facade.call("catalog.updateItem"),
      ),
    ).toThrow(AppOutboundAuthorizationError);
    expect(() =>
      contextRunner.run(context, () =>
        facade.call("payments.readInternalContract"),
      ),
    ).toThrow(AppOutboundAuthorizationError);
    expect(() =>
      contextRunner.run(context, () =>
        facade.runWorkflow(
          "catalog.updateWorkflow",
          {},
          {
            source: "workflow",
            workflowId: "workflow-1",
            stepId: "step-1",
          },
        ),
      ),
    ).toThrow(AppOutboundAuthorizationError);
  });
});

function manifest(): AppManifest {
  return {
    schemaVersion: 1,
    code: "function-test",
    version: "1.0.0",
    displayName: "Function Test",
    description: "Commerce Function policy test",
    lifecycle: {},
    permissions: ["catalog"],
    capabilities: [],
    graphql: {
      admin: false,
      storefront: false,
    },
  };
}
