import { createHash } from "node:crypto";
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
  SmsDeliveryInput,
} from "@shopana/broker-types";

export interface TestTwilioMessage {
  readonly to: string;
  readonly text: string;
  readonly deliveryId: string;
  readonly receivedAt: string;
}

export class TestTwilioApp implements ShopanaApp {
  private readonly outbox: TestTwilioMessage[] = [];

  constructor(private readonly host: AppHostContext) {}

  register(): void {
    this.host.broker.registerWorkflow("install", {
      run: (input) => ({ status: "installed", version: (input as AppInstallInput).version }),
    });
    this.host.broker.registerWorkflow("update", {
      run: (input) => ({ status: "updated", version: (input as AppUpdateInput).targetVersion }),
    });
    this.host.broker.registerWorkflow("uninstall", {
      run: (input) => {
        this.outbox.length = 0;
        return { status: "uninstalled", version: (input as AppUninstallInput).version };
      },
    });
    this.host.broker.register("suspend", () => ({ status: "suspended" }));
    this.host.broker.register("resume", () => ({ status: "active" }));
    this.host.broker.register("health", () => this.health());
    this.host.broker.register("getCapabilities", () => ({ channels: ["SMS"] }));
    this.host.broker.register<NotificationDeliveryInput, NotificationDeliveryReceipt>(
      "deliver",
      (input) => this.deliver(input)
    );
  }

  start(): void {}

  stop(): void {
    this.outbox.length = 0;
  }

  async health(): Promise<AppRuntimeHealth> {
    return { status: "healthy" };
  }

  messages(): readonly TestTwilioMessage[] {
    return [...this.outbox];
  }

  private deliver(
    input: NotificationDeliveryInput | undefined
  ): NotificationDeliveryReceipt {
    if (!input || input.channel !== "SMS") {
      return {
        state: "UNSUPPORTED",
        providerCode: "test-twilio",
        responseCode: "TEST_TWILIO_SMS_ONLY",
      };
    }
    const context = this.host.executionContext.current();
    if (input.storeId !== context.storeId) {
      throw new Error("Twilio Test delivery store does not match App installation");
    }
    this.capture(input);
    const providerMessageId = `SM${createHash("sha256")
      .update(input.deliveryId)
      .digest("hex")
      .slice(0, 32)}`;
    const deliveredAt = new Date().toISOString();
    return {
      state: "DELIVERED",
      providerCode: "test-twilio",
      providerMessageId,
      acceptedAt: deliveredAt,
      deliveredAt,
      responseCode: "TEST_DELIVERED",
    };
  }

  private capture(input: SmsDeliveryInput): void {
    this.outbox.push({
      to: input.to,
      text: input.text,
      deliveryId: input.deliveryId,
      receivedAt: new Date().toISOString(),
    });
  }
}
