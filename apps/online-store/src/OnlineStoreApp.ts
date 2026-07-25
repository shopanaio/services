import type {
  AppHostContext,
  AppRuntimeHealth,
  ShopanaApp,
} from "@shopana/app-sdk";

export class OnlineStoreApp implements ShopanaApp {
  constructor(private readonly host: AppHostContext) {}

  register(): void {
    this.host.broker.registerWorkflow("install", { run: () => undefined });
    this.host.broker.registerWorkflow("update", { run: () => undefined });
    this.host.broker.registerWorkflow("uninstall", { run: () => undefined });
    this.host.broker.register("suspend", () => ({ status: "suspended" }));
    this.host.broker.register("resume", () => ({ status: "active" }));
    this.host.broker.register("health", () => this.health());
    this.host.broker.register("channelConnect", () => ({}));
    this.host.broker.register("channelUpdate", () => ({}));
    this.host.broker.register("channelDisconnect", () => undefined);
    this.host.broker.register("channelSuspend", () => undefined);
    this.host.broker.register("channelResume", () => undefined);
    this.host.broker.register("channelHealth", () => ({
      status: "healthy",
    }));
  }

  start(): void {
    this.host.logger.log("Online Store App started");
  }

  stop(): void {
    this.host.logger.log("Online Store App stopped");
  }

  async health(): Promise<AppRuntimeHealth> {
    return { status: "healthy" };
  }
}
