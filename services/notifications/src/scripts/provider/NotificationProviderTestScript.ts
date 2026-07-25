import type { Apps, Notifications } from "@shopana/broker-types";
import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationProviderTestParams,
  NotificationProviderTestResult,
} from "./dto/index.js";

export class NotificationProviderTestScript extends BaseAdminScript<
  NotificationProviderTestParams,
  NotificationProviderTestResult
> {
  protected async execute(
    params: NotificationProviderTestParams
  ): Promise<NotificationProviderTestResult> {
    await this.authorize("notification_provider", "test");
    return this.services.broker.call<
      Notifications.NotificationProviderTestResult,
      Apps.TestNotificationProviderParams
    >("apps.testNotificationProvider", {
      storeId: this.context.store.id,
      channel: params.channel,
      input: {
        channel: params.channel,
        recipient: params.recipient,
      },
    });
  }
}
