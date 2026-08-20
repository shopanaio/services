import type {
  AppHostContext,
  AppInstallInput,
  AppRuntimeHealth,
  AppSuspendInput,
  AppResumeInput,
  AppUninstallInput,
  AppUpdateInput,
  ShopanaApp,
} from "@shopana/app-sdk";
import { STOREFRONT_PERMISSION_CATALOG } from "@shopana/storefront-permissions";
import { HEADLESS_STOREFRONT_DEFAULT_PERMISSIONS, headlessManifest } from "../app.manifest.js";
import {
  HeadlessStorefrontConnectionService,
  StorefrontAccessPolicyService,
  StorefrontCredentialCrypto,
  StorefrontCredentialService,
} from "./storefront-access/control-plane/index.js";
import {
  StorefrontAccessInternalServer,
  StorefrontCredentialResolver,
} from "./storefront-access/data-plane/index.js";
import { HeadlessStorefrontRepository } from "./storefront-access/repositories/index.js";

type InstallationLifecycleResult = Readonly<{
  status: "installed" | "updated" | "uninstalled";
  version: string;
}>;

type InstallationStateResult = Readonly<{
  status: "active" | "suspended";
  installationId: string;
}>;

export class HeadlessApp implements ShopanaApp {
  readonly repository: HeadlessStorefrontRepository;
  readonly crypto: StorefrontCredentialCrypto;
  readonly policies: StorefrontAccessPolicyService;
  readonly credentials: StorefrontCredentialService;
  readonly connections: HeadlessStorefrontConnectionService;
  private readonly internalServer: StorefrontAccessInternalServer;

  constructor(private readonly host: AppHostContext) {
    this.repository = HeadlessStorefrontRepository.create(host.databaseClient);
    this.crypto = StorefrontCredentialCrypto.fromEnvironment();
    this.policies = new StorefrontAccessPolicyService(this.repository);
    this.credentials = new StorefrontCredentialService(this.repository, this.crypto);
    this.connections = new HeadlessStorefrontConnectionService(
      this.repository,
      this.policies,
      this.credentials,
      HEADLESS_STOREFRONT_DEFAULT_PERMISSIONS,
    );
    const internal = host.config.internal as { readonly port?: unknown } | undefined;
    this.internalServer = new StorefrontAccessInternalServer(
      new StorefrontCredentialResolver(
        this.repository,
        this.crypto,
        host,
        headlessManifest.version,
      ),
      Number(internal?.port),
      requireEnvironment("STOREFRONT_RESOLVER_INTERNAL_TOKEN"),
      host.logger,
    );
  }

  register(): void {
    this.registerInstallationLifecycle();
    this.host.broker.register("permissionCatalog", () => STOREFRONT_PERMISSION_CATALOG);
  }

  async start(): Promise<void> {
    await this.internalServer.start();
  }

  async stop(): Promise<void> {
    await this.internalServer.stop();
    this.host.logger.log("Headless App stopped");
  }

  async health(): Promise<AppRuntimeHealth> {
    return { status: "healthy" };
  }

  private registerInstallationLifecycle(): void {
    this.host.broker.registerWorkflow("install", {
      run: (input: unknown): InstallationLifecycleResult => {
        const install = input as AppInstallInput;
        return {
          status: "installed",
          version: install.version,
        };
      },
    });
    this.host.broker.registerWorkflow("update", {
      run: (input: unknown): InstallationLifecycleResult => {
        const update = input as AppUpdateInput;
        return {
          status: "updated",
          version: update.targetVersion,
        };
      },
    });
    this.host.broker.registerWorkflow("uninstall", {
      run: async (input: unknown): Promise<InstallationLifecycleResult> => {
        const uninstall = input as AppUninstallInput;
        const app = this.host.executionContext.current();
        await this.connections.disconnectAll(
          {
            installationId: app.installationId,
            organizationId: app.organizationId,
            storeId: app.storeId,
          },
          app.actor ?? { type: "SYSTEM" },
        );
        return {
          status: "uninstalled",
          version: uninstall.version,
        };
      },
    });
    this.host.broker.register<AppSuspendInput, InstallationStateResult>("suspend", (input) => ({
      status: "suspended",
      installationId: input?.installationId ?? this.host.executionContext.current().installationId,
    }));
    this.host.broker.register<AppResumeInput, InstallationStateResult>("resume", (input) => ({
      status: "active",
      installationId: input?.installationId ?? this.host.executionContext.current().installationId,
    }));
    this.host.broker.register("health", () => this.health());
  }
}

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
