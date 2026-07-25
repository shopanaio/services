import type { Apps } from "@shopana/broker-types";
import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationProviderConfigureParams,
  NotificationProviderConfigureResult,
} from "./dto/index.js";

export class NotificationProviderConfigureScript extends BaseAdminScript<
  NotificationProviderConfigureParams,
  NotificationProviderConfigureResult
> {
  protected async execute(
    params: NotificationProviderConfigureParams
  ): Promise<NotificationProviderConfigureResult> {
    const result = await this.services.broker.call<
      Apps.ConfigureNotificationProviderResult,
      Apps.ConfigureNotificationProviderParams
    >("apps.configureNotificationProvider", {
      ...params,
      storeId: this.context.store.id,
    });
    await this.audit(
      "provider.configured",
      "providerRoute",
      params.channel,
      { providerCode: params.providerCode, channel: params.channel }
    );
    return result;
  }
}
