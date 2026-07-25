import type { Apps } from "@shopana/broker-types";
import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationProviderConfigurationQueryParams,
  NotificationProviderConfigurationView,
} from "./dto/index.js";

export class NotificationProviderConfigurationQueryScript extends BaseAdminScript<
  NotificationProviderConfigurationQueryParams,
  NotificationProviderConfigurationView
> {
  protected async execute(
    params: NotificationProviderConfigurationQueryParams
  ): Promise<NotificationProviderConfigurationView> {
    return this.services.broker.call<
      Apps.GetMaskedNotificationProviderConfigResult,
      Apps.GetMaskedNotificationProviderConfigParams
    >("apps.getMaskedNotificationProviderConfig", {
      storeId: this.context.store.id,
      channel: params.channel,
    });
  }
}
