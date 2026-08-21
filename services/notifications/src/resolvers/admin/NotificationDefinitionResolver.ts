import type { TemplateDefinitionRegistry } from "../../infrastructure/templates/TemplateDefinitionRegistry.js";
import type { SettingsRepository } from "../../repositories/settings/SettingsRepository.js";
import { NotificationsType } from "./NotificationsType.js";
import { toGraphQLAudience, toGraphQLChannel, toGraphQLTemplateVariable } from "./mappers.js";

export interface NotificationDefinitionResolverData {
  definition: ReturnType<TemplateDefinitionRegistry["get"]>;
  setting: Awaited<ReturnType<SettingsRepository["getDefinitionSetting"]>> | null;
  channels: Awaited<ReturnType<SettingsRepository["listChannelSettings"]>>;
}

export class NotificationDefinitionResolver extends NotificationsType<
  NotificationDefinitionResolverData,
  NotificationDefinitionResolverData
> {
  $preload() {
    return this.$props;
  }

  key() {
    return this.$props.definition.key;
  }

  async title() {
    return (await this.$get("definition")).title;
  }

  async audience() {
    return toGraphQLAudience((await this.$get("definition")).audience);
  }

  async optional() {
    return (await this.$get("definition")).optional;
  }

  async enabled() {
    const [definition, setting] = await Promise.all([
      this.$get("definition"),
      this.$get("setting"),
    ]);
    return definition.optional ? (setting?.enabled ?? false) : true;
  }

  async allowedChannels() {
    return (await this.$get("definition")).allowedChannels.map(toGraphQLChannel);
  }

  async defaultChannels() {
    return (await this.$get("definition")).defaultChannels.map(toGraphQLChannel);
  }

  async activeChannels() {
    const [definition, channels] = await Promise.all([
      this.$get("definition"),
      this.$get("channels"),
    ]);
    return definition.allowedChannels
      .filter(
        (channel) =>
          channels.find((entry) => entry.channel === channel)?.enabled ??
          definition.defaultChannels.includes(channel),
      )
      .map(toGraphQLChannel);
  }

  async variables() {
    return (await this.$get("definition")).variables.map(toGraphQLTemplateVariable);
  }
}
