import type { Apps, Notifications } from "@shopana/broker-types";
import { BaseAdminMutationScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationProviderTestParams,
  NotificationProviderTestResult,
} from "./dto/index.js";

export class NotificationProviderTestScript extends BaseAdminMutationScript<
  NotificationProviderTestParams,
  NotificationProviderTestResult
> {
  protected async execute(
    params: NotificationProviderTestParams
  ) {
    const result = await this.services.broker.call<
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
    return this.success(result);
  }
}
