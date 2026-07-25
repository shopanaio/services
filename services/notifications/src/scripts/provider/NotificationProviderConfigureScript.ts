import type { Apps } from "@shopana/broker-types";
import { BaseScript } from "../../kernel/BaseScript.js";
import {
  adminUserErrors,
  recordAdminAudit,
  type AdminUserError,
} from "../shared/adminScriptSupport.js";
import type {
  NotificationProviderConfigureParams,
  NotificationProviderConfigureResult,
} from "./dto/index.js";

export interface NotificationProviderConfigureScriptResult {
  configuration?: NotificationProviderConfigureResult;
  userErrors: AdminUserError[];
}

export class NotificationProviderConfigureScript extends BaseScript<
  NotificationProviderConfigureParams,
  NotificationProviderConfigureScriptResult
> {
  protected async execute(
    params: NotificationProviderConfigureParams
  ) {
    const result = await this.services.broker.call<
      Apps.ConfigureNotificationProviderResult,
      Apps.ConfigureNotificationProviderParams
    >("apps.configureNotificationProvider", {
      ...params,
      storeId: this.context.store.id,
    });
    await recordAdminAudit(
      this.repository,
      this.context.user.id,
      "provider.configured",
      "providerRoute",
      params.channel,
      { providerCode: params.providerCode, channel: params.channel }
    );
    return { configuration: result, userErrors: [] };
  }

  protected handleError(error: unknown): NotificationProviderConfigureScriptResult {
    return { configuration: undefined, userErrors: adminUserErrors(error) };
  }
}
