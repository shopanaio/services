import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationChannelSettingView,
  NotificationDefinitionSetEnabledParams,
} from "./dto/index.js";

export class NotificationChannelSettingsQueryScript extends BaseAdminScript<
  Pick<NotificationDefinitionSetEnabledParams, "key">,
  NotificationChannelSettingView[]
> {
  protected async execute(
    params: Pick<NotificationDefinitionSetEnabledParams, "key">
  ): Promise<NotificationChannelSettingView[]> {
    const definition = this.definitions.get(params.key);
    const settings =
      await this.repository.settings.listChannelSettings(params.key);
    return definition.allowedChannels.map((channel) => {
      const setting = settings.find((entry) => entry.channel === channel);
      return setting
        ? {
            definitionKey: params.key,
            channel: setting.channel,
            enabled: setting.enabled,
            senderName: setting.senderName,
            senderEmail: setting.senderEmail,
            replyTo: setting.replyTo,
            version: setting.version,
            updatedAt: setting.updatedAt,
          }
        : {
            definitionKey: params.key,
            channel,
            enabled: definition.defaultChannels.includes(channel),
            senderName: null,
            senderEmail: null,
            replyTo: null,
            version: 0,
            updatedAt: null,
          };
    });
  }
}
