import type {
  AppHostContext,
  AppInstallInput,
  AppRuntimeHealth,
  AppUpdateInput,
  ShopanaApp,
} from "@shopana/app-sdk";
import type {
  NotificationDeliveryInput,
  NotificationDeliveryReceipt,
} from "@shopana/broker-types";
import {
  parseSmtpConfiguration,
  parseSmtpDeploymentPolicy,
  SMTP_PASSWORD_SECRET,
  validateSmtpPassword,
} from "./configuration.js";
import { deliverEmail as sendEmail } from "./delivery.js";

export class SmtpApp implements ShopanaApp {
  constructor(private readonly host: AppHostContext) {}

  register(): void {
    this.host.broker.registerWorkflow("install", {
      run: (input: unknown) => this.validateLifecycleConfiguration(input),
    });
    this.host.broker.registerWorkflow("update", {
      run: (input: unknown) => this.validateLifecycleConfiguration(input),
    });
    this.host.broker.registerWorkflow("uninstall", {
      run: () => ({ status: "uninstalled" }),
    });
    this.host.broker.register("suspend", () => ({ status: "suspended" }));
    this.host.broker.register("resume", () => ({ status: "active" }));
    this.host.broker.register("health", () => ({
      status: "healthy",
    }));
    this.host.broker.register<
      NotificationDeliveryInput,
      NotificationDeliveryReceipt
    >("deliver", (input) => this.deliver(input));
  }

  start(): void {
    this.host.logger.log("SMTP App started");
  }

  stop(): void {
    this.host.logger.log("SMTP App stopped");
  }

  async health(): Promise<AppRuntimeHealth> {
    return { status: "healthy" };
  }

  private async validateLifecycleConfiguration(input: unknown): Promise<{
    readonly status: "configured";
  }> {
    const lifecycle = input as AppInstallInput | AppUpdateInput;
    const configuration = parseSmtpConfiguration(
      lifecycle.configuration,
      parseSmtpDeploymentPolicy(this.host.config),
    );
    if (configuration.username) {
      validateSmtpPassword(
        await this.host.secrets.resolve(SMTP_PASSWORD_SECRET),
      );
    }
    return { status: "configured" };
  }

  private async deliver(
    input: NotificationDeliveryInput | undefined,
  ): Promise<NotificationDeliveryReceipt> {
    if (!input || input.channel !== "EMAIL") {
      return {
        state: "UNSUPPORTED",
        providerCode: "smtp",
        responseCode: "SMTP_EMAIL_ONLY",
      };
    }

    const context = this.host.executionContext.current();
    if (input.storeId !== context.storeId) {
      throw new Error("SMTP delivery store does not match App installation");
    }
    const policy = parseSmtpDeploymentPolicy(this.host.config);
    const configuration = parseSmtpConfiguration(
      await this.host.configuration.resolve(),
      policy,
    );
    const password = configuration.username
      ? validateSmtpPassword(
          await this.host.secrets.resolve(SMTP_PASSWORD_SECRET),
        )
      : undefined;

    return sendEmail(
      configuration,
      {
        username: configuration.username,
        password,
      },
      input,
      policy,
    );
  }
}
