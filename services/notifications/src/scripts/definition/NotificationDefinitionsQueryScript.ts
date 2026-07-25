import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type { NotificationDefinitionView } from "./dto/index.js";

export class NotificationDefinitionsQueryScript extends BaseAdminScript<
  Record<string, never>,
  NotificationDefinitionView[]
> {
  protected async execute(): Promise<NotificationDefinitionView[]> {
    await this.authorize("notification_settings", "read");
    const [settings, channels] = await Promise.all([
      this.repository.settings.listDefinitionSettings(),
      this.repository.settings.listChannelSettings(),
    ]);
    return this.definitions.list().map((definition) => ({
      key: definition.key,
      title: definition.title,
      audience: definition.audience,
      optional: definition.optional,
      enabled: definition.optional
        ? (settings.find((entry) => entry.definitionKey === definition.key)
            ?.enabled ?? false)
        : true,
      allowedChannels: definition.allowedChannels,
      defaultChannels: definition.defaultChannels,
      activeChannels: definition.allowedChannels.filter(
        (channel) =>
          channels.find(
            (entry) =>
              entry.definitionKey === definition.key &&
              entry.channel === channel
          )?.enabled ?? definition.defaultChannels.includes(channel)
      ),
      variables: definition.variables,
      version:
        settings.find((entry) => entry.definitionKey === definition.key)
          ?.version ?? 0,
    }));
  }
}
