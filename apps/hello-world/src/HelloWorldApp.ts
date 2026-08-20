import type {
  AppHostContext,
  AppInstallInput,
  AppRuntimeHealth,
  AppUninstallInput,
  AppUpdateInput,
  ShopanaApp,
} from "@shopana/app-sdk";

export class HelloWorldApp implements ShopanaApp {
  constructor(private readonly host: AppHostContext) {}

  register(): void {
    this.host.broker.register("hello", () => ({
      message: "Hello, world!",
      appCode: "hello-world",
    }));

    this.host.broker.register("health", () => this.health());
    this.host.broker.register("suspend", () => ({
      status: "suspended",
      installationId: this.host.executionContext.current().installationId,
    }));
    this.host.broker.register("resume", () => ({
      status: "active",
      installationId: this.host.executionContext.current().installationId,
    }));
    this.host.broker.registerWorkflow("install", {
      run: (input: unknown) => {
        const install = input as AppInstallInput;
        return {
          status: "installed",
          version: install.version,
          installationId: this.host.executionContext.current().installationId,
        };
      },
    });
    this.host.broker.registerWorkflow("update", {
      run: (input: unknown) => {
        const update = input as AppUpdateInput;
        return {
          status: "updated",
          version: update.targetVersion,
          installationId: this.host.executionContext.current().installationId,
        };
      },
    });
    this.host.broker.registerWorkflow("uninstall", {
      run: (input: unknown) => {
        const uninstall = input as AppUninstallInput;
        return {
          status: "uninstalled",
          version: uninstall.version,
          installationId: this.host.executionContext.current().installationId,
        };
      },
    });
  }

  start(): void {}

  stop(): void {
    this.host.logger.log("Hello World App stopped");
  }

  async health(): Promise<AppRuntimeHealth> {
    return { status: "healthy" };
  }
}
