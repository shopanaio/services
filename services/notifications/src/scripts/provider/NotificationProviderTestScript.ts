import type { Apps, Notifications } from "@shopana/broker-types";
import { BaseScript } from "../../kernel/BaseScript.js";
import {
  adminUserErrors,
  type AdminUserError,
} from "../shared/adminScriptSupport.js";
import type {
  NotificationProviderTestParams,
  NotificationProviderTestResult,
} from "./dto/index.js";

export interface NotificationProviderTestScriptResult {
  testResult?: NotificationProviderTestResult;
  userErrors: AdminUserError[];
}

export class NotificationProviderTestScript extends BaseScript<
  NotificationProviderTestParams,
  NotificationProviderTestScriptResult
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
    return { testResult: result, userErrors: [] };
  }

  protected handleError(error: unknown): NotificationProviderTestScriptResult {
    return { testResult: undefined, userErrors: adminUserErrors(error) };
  }
}
