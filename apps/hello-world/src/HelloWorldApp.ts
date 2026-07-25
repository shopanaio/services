import type {
  AppHostContext,
  AppRuntimeHealth,
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
  }

  start(): void {
    this.host.logger.log("Hello World App started");
  }

  stop(): void {
    this.host.logger.log("Hello World App stopped");
  }

  async health(): Promise<AppRuntimeHealth> {
    return { status: "healthy" };
  }
}
