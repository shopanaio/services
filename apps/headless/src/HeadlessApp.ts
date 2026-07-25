import type {
  AppHostContext,
  AppInstallInput,
  AppRuntimeHealth,
  AppSuspendInput,
  AppResumeInput,
  AppUninstallInput,
  AppUpdateInput,
  SalesChannelActionInput,
  SalesChannelConnectInput,
  SalesChannelConnectResult,
  SalesChannelUpdateInput,
  SalesChannelUpdateResult,
  ShopanaApp,
} from "@shopana/app-sdk";
import { HEADLESS_STOREFRONT_SPECIFICATION_HANDLE } from "../app.manifest.js";

type InstallationLifecycleResult = Readonly<{
  status: "installed" | "updated" | "uninstalled";
  version: string;
}>;

type InstallationStateResult = Readonly<{
  status: "active" | "suspended";
  installationId: string;
}>;

export class HeadlessApp implements ShopanaApp {
  constructor(private readonly host: AppHostContext) {}

  register(): void {
    this.registerInstallationLifecycle();
    this.registerSalesChannelLifecycle();
  }

  start(): void {
    this.host.logger.log("Headless App started");
  }

  stop(): void {
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
      run: (input: unknown): InstallationLifecycleResult => {
        const uninstall = input as AppUninstallInput;
        return {
          status: "uninstalled",
          version: uninstall.version,
        };
      },
    });
    this.host.broker.register<AppSuspendInput, InstallationStateResult>(
      "suspend",
      (input) => ({
        status: "suspended",
        installationId:
          input?.installationId ??
          this.host.executionContext.current().installationId,
      }),
    );
    this.host.broker.register<AppResumeInput, InstallationStateResult>(
      "resume",
      (input) => ({
        status: "active",
        installationId:
          input?.installationId ??
          this.host.executionContext.current().installationId,
      }),
    );
    this.host.broker.register("health", () => this.health());
  }

  private registerSalesChannelLifecycle(): void {
    this.host.broker.register<
      SalesChannelConnectInput,
      SalesChannelConnectResult
    >("channelConnect", (input) => {
      const channel = requireHeadlessChannel(input);
      return {
        configuration: normalizeHeadlessConfiguration(
          channel.configuration,
        ),
      };
    });
    this.host.broker.register<
      SalesChannelUpdateInput,
      SalesChannelUpdateResult
    >("channelUpdate", (input) => {
      const channel = requireHeadlessChannel(input);
      return {
        configuration: normalizeHeadlessConfiguration(
          channel.configuration,
        ),
      };
    });
    this.host.broker.register<SalesChannelActionInput, void>(
      "channelDisconnect",
      (input) => {
        requireHeadlessChannel(input);
      },
    );
    this.host.broker.register<SalesChannelActionInput, void>(
      "channelSuspend",
      (input) => {
        requireHeadlessChannel(input);
      },
    );
    this.host.broker.register<SalesChannelActionInput, void>(
      "channelResume",
      (input) => {
        requireHeadlessChannel(input);
      },
    );
    this.host.broker.register<
      SalesChannelActionInput,
      AppRuntimeHealth
    >("channelHealth", (input) => {
      requireHeadlessChannel(input);
      return { status: "healthy" };
    });
  }
}

function requireHeadlessChannel<
  TInput extends
    | SalesChannelConnectInput
    | SalesChannelUpdateInput
    | SalesChannelActionInput,
>(input: TInput | undefined): TInput {
  if (!input) {
    throw new Error("Headless sales-channel input is required");
  }
  if (
    input.specificationHandle !==
    HEADLESS_STOREFRONT_SPECIFICATION_HANDLE
  ) {
    throw new Error("Unsupported sales-channel specification");
  }
  if (!input.connectionId.trim()) {
    throw new Error("Headless sales-channel connectionId is required");
  }
  return input;
}

function normalizeHeadlessConfiguration(
  configuration: Readonly<Record<string, unknown>>,
): Readonly<Record<string, never>> {
  if (!isPlainObject(configuration)) {
    throw new Error(
      "Headless sales-channel configuration must be an object",
    );
  }
  if (Object.keys(configuration).length > 0) {
    throw new Error(
      "Headless sales-channel configuration does not accept fields",
    );
  }
  return Object.freeze({});
}

function isPlainObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
