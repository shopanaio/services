import type {
  AppHostContext,
  AppInstallInput,
  AppRuntimeHealth,
  AppUninstallInput,
  AppUpdateInput,
  ShopanaApp,
} from "@shopana/app-sdk";

export class BundlesApp implements ShopanaApp {
  constructor(private readonly host: AppHostContext) {}

  register(): void {
    this.host.broker.registerWorkflow("install", {
      run: (input: unknown) => {
        const install = input as AppInstallInput;
        return {
          status: "installed",
          version: install.version,
        };
      },
    });
    this.host.broker.registerWorkflow("update", {
      run: (input: unknown) => {
        const update = input as AppUpdateInput;
        return {
          status: "updated",
          version: update.targetVersion,
        };
      },
    });
    this.host.broker.registerWorkflow("uninstall", {
      run: (input: unknown) => {
        const uninstall = input as AppUninstallInput;
        return {
          status: "uninstalled",
          version: uninstall.version,
        };
      },
    });
    this.host.broker.register("suspend", () => ({
      status: "suspended",
    }));
    this.host.broker.register("resume", () => ({
      status: "active",
    }));
    this.host.broker.register("health", () => this.health());
  }

  start(): void {
    this.host.logger.log("Bundles App started");
  }

  stop(): void {
    this.host.logger.log("Bundles App stopped");
  }

  async health(): Promise<AppRuntimeHealth> {
    return { status: "healthy" };
  }
}
