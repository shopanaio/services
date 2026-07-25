import type { Notifications } from "@shopana/broker-types";
import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationSendTestParams,
  NotificationSendTestResult,
} from "./dto/index.js";

export class NotificationSendTestScript extends BaseAdminScript<
  NotificationSendTestParams,
  NotificationSendTestResult
> {
  protected async execute(
    params: NotificationSendTestParams
  ): Promise<NotificationSendTestResult> {
    return this.services.broker.call<
      Notifications.EnqueueNotificationResult,
      Notifications.SendTestNotificationParams
    >("notifications.sendTest", {
      ...params,
      storeId: this.context.store.id,
      organizationId: this.context.store.organizationId,
    });
  }
}
