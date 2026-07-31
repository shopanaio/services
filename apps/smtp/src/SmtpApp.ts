import type {
  AppHostContext,
  AppInstallInput,
  AppRuntimeHealth,
  AppUninstallInput,
  AppUpdateInput,
  ShopanaApp,
} from "@shopana/app-sdk";
import type {
  NotificationDeliveryInput,
  NotificationDeliveryReceipt,
} from "@shopana/broker-types";
import {
  parseSmtpDeploymentPolicy,
} from "./configuration.js";
import {
  SmtpConnectionService,
  SmtpCredentialCrypto,
  SmtpRepository,
  type SmtpConnectionScope,
} from "./connections/index.js";
import { deliverEmail as sendEmail } from "./delivery.js";

export class SmtpApp implements ShopanaApp {
  readonly repository: SmtpRepository;
  readonly connections: SmtpConnectionService;

  constructor(private readonly host: AppHostContext) {
    this.repository = SmtpRepository.create(host.databaseClient);
    this.connections = new SmtpConnectionService(
      this.repository,
      SmtpCredentialCrypto.fromEnvironment(),
      parseSmtpDeploymentPolicy(host.config),
    );
  }

  register(): void {
    this.host.broker.registerWorkflow("install", {
      run: (input: unknown) => {
        const install = input as AppInstallInput;
        return { status: "installed", version: install.version };
      },
    });
    this.host.broker.registerWorkflow("update", {
      run: (input: unknown) => {
        const update = input as AppUpdateInput;
        return { status: "updated", version: update.targetVersion };
      },
    });
    this.host.broker.registerWorkflow("uninstall", {
      run: async (input: unknown) => {
        const uninstall = input as AppUninstallInput;
        await this.connections.disconnectAll(this.scope());
        return { status: "uninstalled", version: uninstall.version };
      },
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

  start(): void {}

  stop(): void {
    this.host.logger.log("SMTP App stopped");
  }

  async health(): Promise<AppRuntimeHealth> {
    return { status: "healthy" };
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
    const scope = this.scope();
    const connection = await this.connections.findActiveSecret(scope);
    if (!connection) {
      throw Object.assign(
        new Error("No active SMTP connection is configured"),
        {
          code: "SMTP_ACTIVE_CONNECTION_REQUIRED",
          details: Object.freeze({
            kind: "CONFIGURATION",
            safeToRetry: false,
            acceptedByProvider: false,
          }),
        },
      );
    }
    const policy = parseSmtpDeploymentPolicy(this.host.config);
    const receipt = await sendEmail(
      {
        host: connection.host,
        port: connection.port,
        security: connection.security,
        username: connection.username ?? undefined,
      },
      {
        username: connection.username ?? undefined,
        password: this.connections.resolvePassword(scope, connection),
      },
      input,
      policy,
    );
    return {
      ...receipt,
      providerCode: providerCode(connection.provider),
    };
  }

  private scope(): SmtpConnectionScope {
    const context = this.host.executionContext.current();
    return {
      installationId: context.installationId,
      organizationId: context.organizationId,
      storeId: context.storeId,
    };
  }
}

function providerCode(provider: string): string {
  switch (provider) {
    case "SENDGRID":
      return "sendgrid";
    case "MAILCHIMP_TRANSACTIONAL":
      return "mailchimp_transactional";
    case "GOOGLE_WORKSPACE":
      return "google_workspace";
    default:
      return "smtp";
  }
}
