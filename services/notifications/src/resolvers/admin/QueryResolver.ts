import { ApolloQuery } from "@shopana/type-resolver";
import { WEBHOOK_API_VERSIONS } from "../../infrastructure/webhooks/WebhookCapabilities.js";
import type {
  NotificationsQueryChannelSettingsArgs,
  NotificationsQueryTemplateArgs,
} from "./generated/types.js";
import {
  toDefinitionKey,
  toDomainChannel,
  toGraphQLChannel,
  toGraphQLWebhookStability,
} from "./mappers.js";
import { NotificationsType } from "./NotificationsType.js";

@ApolloQuery
export class QueryResolver extends NotificationsType<Record<string, never>> {
  notificationsQuery() {
    return new NotificationsQueryResolver({}, this.$ctx);
  }
}

export class NotificationsQueryResolver extends NotificationsType<
  Record<string, never>
> {
  async definitions() {
    const definitions = this.$ctx.kernel.definitions.list();
    const [settings, channels] = await Promise.all([
      this.$ctx.kernel.repository.settings.listDefinitionSettings(),
      this.$ctx.kernel.repository.settings.listChannelSettings(),
    ]);
    const settingByKey = new Map(
      settings.map((setting) => [setting.definitionKey, setting])
    );
    for (const setting of settings) {
      this.$ctx.loaders.definitionSetting.prime(
        toDefinitionKey(setting.definitionKey),
        setting
      );
    }
    for (const channel of channels) {
      this.$ctx.loaders.channelSetting.prime(
        {
          key: toDefinitionKey(channel.definitionKey),
          channel: channel.channel,
        },
        channel
      );
    }
    const channelsByKey = new Map(
      definitions.map((definition) => [
        definition.key,
        channels.filter(
          (channel) => channel.definitionKey === definition.key
        ),
      ])
    );

    return Promise.all(
      definitions.map((definition) =>
        this.resolvers.notificationDefinition({
          definition,
          setting: settingByKey.get(definition.key) ?? null,
          channels: channelsByKey.get(definition.key) ?? [],
        })
      )
    );
  }

  async channelSettings(args: NotificationsQueryChannelSettingsArgs) {
    const key = toDefinitionKey(args.key);
    const definition = this.$ctx.kernel.definitions.get(key);
    return Promise.all(
      definition.allowedChannels.map((channel) =>
        this.resolvers.notificationChannelSetting({ key, channel })
      )
    );
  }

  async template(args: NotificationsQueryTemplateArgs) {
    return this.resolvers.notificationEffectiveTemplate({
      key: toDefinitionKey(args.key),
      channel: toDomainChannel(args.channel),
      locale: args.locale,
    });
  }

  async staffRecipients() {
    const recipients = await this.$ctx.kernel.repository.staff.list();
    return Promise.all(
      recipients.map((recipient) => this.resolvers.staffRecipient(recipient))
    );
  }

  webhookCapabilities() {
    return {
      events: this.$ctx.kernel.definitions.listEventTypes().map((eventType) => ({
        eventType,
        title: humanizeEventType(eventType),
      })),
      apiVersions: WEBHOOK_API_VERSIONS.map((version) => ({
        ...version,
        stability: toGraphQLWebhookStability(version.stability),
      })),
    };
  }

  async webhookSubscriptions() {
    const webhooks = await this.$ctx.kernel.repository.webhooks.list();
    for (const webhook of webhooks) {
      this.$ctx.loaders.webhook.prime(webhook.id, webhook);
    }
    return Promise.all(
      webhooks.map((webhook) => this.resolvers.webhook(webhook.id))
    );
  }
}

function humanizeEventType(value: string): string {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return words.length === 0
    ? value
    : words[0]!.toUpperCase() + words.slice(1);
}
