import type { NotificationChannel, NotificationDefinitionKey } from "@shopana/broker-types";
import type { TemplateDefinitionRegistry } from "../../infrastructure/templates/TemplateDefinitionRegistry.js";
import type { SettingsRepository } from "../../repositories/settings/SettingsRepository.js";
import { NotificationsType } from "./NotificationsType.js";
import { toGraphQLChannel } from "./mappers.js";

interface NotificationChannelSettingInput {
  key: NotificationDefinitionKey;
  channel: NotificationChannel;
}

type NotificationChannelSettingData = {
  definition: ReturnType<TemplateDefinitionRegistry["get"]>;
  setting: Awaited<ReturnType<SettingsRepository["getChannelSetting"]>> | null;
};

export class NotificationChannelSettingResolver extends NotificationsType<
  NotificationChannelSettingInput,
  NotificationChannelSettingData
> {
  async $preload() {
    const definition = this.$ctx.kernel.definitions.get(this.$props.key);
    const setting = await this.$ctx.loaders.channelSetting.load(this.$props);
    return { definition, setting };
  }

  definitionKey() {
    return this.$props.key;
  }

  channel() {
    return toGraphQLChannel(this.$props.channel);
  }

  async enabled() {
    const [definition, setting] = await Promise.all([
      this.$get("definition"),
      this.$get("setting"),
    ]);
    return setting?.enabled ?? definition.defaultChannels.includes(this.$props.channel);
  }

  async senderName() {
    return (await this.$get("setting"))?.senderName ?? null;
  }

  async senderEmail() {
    return (await this.$get("setting"))?.senderEmail ?? null;
  }

  async replyTo() {
    return (await this.$get("setting"))?.replyTo ?? null;
  }

  async version() {
    return (await this.$get("setting"))?.version ?? 0;
  }

  async updatedAt() {
    return (await this.$get("setting"))?.updatedAt ?? null;
  }
}
