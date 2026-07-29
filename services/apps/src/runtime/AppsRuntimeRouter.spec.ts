import { describe, expect, it, jest } from "@jest/globals";
import type {
  AppInstallationContextProvider,
  AppManifest,
} from "@shopana/app-sdk";
import type { ServiceBroker } from "@shopana/shared-kernel";
import { AppRuntimeInvocationError } from "./AppRuntimeInvocationError.js";
import { AppRuntimeRegistry } from "./AppRuntimeRegistry.js";
import { AppsRuntimeRouter } from "./AppsRuntimeRouter.js";

describe("AppsRuntimeRouter Commerce Function policy", () => {
  it("rejects an App action that is not explicitly read-only", async () => {
    const resolve = jest.fn(async () => executionContext());
    const callAsApp = jest.fn(async () => ({ ok: true }));
    const router = createRouter({
      metadata: undefined,
      resolve,
      callAsApp,
    });

    await expect(
      router.invoke(
        "function-test",
        "transform",
        {},
        {
          installationId: "installation-1",
          executionKind: "COMMERCE_FUNCTION",
        },
      ),
    ).rejects.toMatchObject({
      code: "APP_ACTION_NOT_READ_ONLY",
    } satisfies Partial<AppRuntimeInvocationError>);

    expect(resolve).not.toHaveBeenCalled();
    expect(callAsApp).not.toHaveBeenCalled();
  });

  it("allows an explicitly read-only App action", async () => {
    const resolve = jest.fn(async () => executionContext());
    const callAsApp = jest.fn(async () => ({ ok: true }));
    const router = createRouter({
      metadata: { readOnly: true },
      resolve,
      callAsApp,
    });

    await expect(
      router.invoke(
        "function-test",
        "transform",
        {},
        {
          installationId: "installation-1",
          executionKind: "COMMERCE_FUNCTION",
        },
      ),
    ).resolves.toEqual({ ok: true });

    expect(callAsApp).toHaveBeenCalledWith(
      "apps.function-test.transform",
      {},
      expect.objectContaining({
        executionKind: "COMMERCE_FUNCTION",
      }),
    );
  });
});

function createRouter(input: {
  readonly metadata: { readonly readOnly?: boolean } | undefined;
  readonly resolve: unknown;
  readonly callAsApp: unknown;
}): AppsRuntimeRouter {
  const broker = {
    getActionMetadata: () => input.metadata,
    callAsApp: input.callAsApp,
  } as unknown as ServiceBroker;
  const registry = {
    get: () => ({
      status: "READY",
      definition: { manifest: manifest() },
    }),
  } as unknown as AppRuntimeRegistry;
  const installations = {
    resolve: input.resolve,
  } as unknown as AppInstallationContextProvider;
  return new AppsRuntimeRouter(broker, registry, installations);
}

function manifest(): AppManifest {
  return {
    schemaVersion: 1,
    code: "function-test",
    version: "1.0.0",
    displayName: "Function Test",
    description: "Commerce Function runtime policy test",
    lifecycle: {},
    permissions: [],
    capabilities: [
      {
        key: "commerce.function",
        operations: {
          "cart.transform.run": "transform",
        },
      },
    ],
    graphql: {
      admin: false,
      storefront: false,
    },
  };
}

function executionContext() {
  return {
    appCode: "function-test",
    installationId: "installation-1",
    organizationId: "organization-1",
    storeId: "store-1",
    appVersion: "1.0.0",
    grantedScopes: [],
  } as const;
}
