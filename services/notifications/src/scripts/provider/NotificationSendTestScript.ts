import type { Notifications } from "@shopana/broker-types";
import { BaseAdminMutationScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationSendTestParams,
  NotificationSendTestResult,
} from "./dto/index.js";

export class NotificationSendTestScript extends BaseAdminMutationScript<
  NotificationSendTestParams,
  NotificationSendTestResult
> {
  protected async execute(
    params: NotificationSendTestParams
  ) {
    this.definitions.get(params.key);
    const result = await this.services.broker.call<
      Notifications.EnqueueNotificationResult,
      Notifications.SendTestNotificationParams
    >("notifications.sendTest", {
      ...params,
      storeId: this.context.store.id,
      organizationId: this.context.store.organizationId,
    });
    return this.success(result);
  }
}
