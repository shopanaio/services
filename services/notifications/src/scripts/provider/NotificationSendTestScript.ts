import type { Notifications } from "@shopana/broker-types";
import { BaseScript } from "../../kernel/BaseScript.js";
import {
  adminUserErrors,
  type AdminUserError,
} from "../shared/adminScriptSupport.js";
import type {
  NotificationSendTestParams,
  NotificationSendTestResult,
} from "./dto/index.js";

export interface NotificationSendTestScriptResult {
  workflow?: NotificationSendTestResult;
  userErrors: AdminUserError[];
}

export class NotificationSendTestScript extends BaseScript<
  NotificationSendTestParams,
  NotificationSendTestScriptResult
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
    return { workflow: result, userErrors: [] };
  }

  protected handleError(error: unknown): NotificationSendTestScriptResult {
    return { workflow: undefined, userErrors: adminUserErrors(error) };
  }
}
