import { ApolloQuery } from "@shopana/type-resolver";
import {
  NotificationChannelSettingsQueryScript,
  NotificationDefinitionsQueryScript,
  NotificationProviderConfigurationQueryScript,
  NotificationProviderRoutesQueryScript,
  NotificationTemplateQueryScript,
  NotificationWebhookCapabilitiesQueryScript,
  NotificationWebhooksQueryScript,
  StaffRecipientsQueryScript,
} from "../../scripts/index.js";
import type {
  NotificationsQueryChannelSettingsArgs,
  NotificationsQueryProviderConfigurationArgs,
  NotificationsQueryTemplateArgs,
} from "./generated/types.js";
import {
  toDefinitionKey,
  toDomainChannel,
  toGraphQLAudience,
  toGraphQLChannel,
  toGraphQLEffectiveTemplate,
  toGraphQLTemplateVariable,
  toGraphQLWebhook,
  toGraphQLWebhookStability,
} from "./mappers.js";
import { NotificationsType } from "./NotificationsType.js";
import { runQueryScript } from "./runQueryScript.js";

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
    const definitions = await runQueryScript(
      this.$ctx,
      NotificationDefinitionsQueryScript,
      {}
    );
    return definitions.map((definition) => ({
      ...definition,
      audience: toGraphQLAudience(definition.audience),
      allowedChannels: definition.allowedChannels.map(toGraphQLChannel),
      defaultChannels: definition.defaultChannels.map(toGraphQLChannel),
      activeChannels: definition.activeChannels.map(toGraphQLChannel),
      variables: definition.variables.map(toGraphQLTemplateVariable),
    }));
  }

  async channelSettings(args: NotificationsQueryChannelSettingsArgs) {
    const settings = await runQueryScript(
      this.$ctx,
      NotificationChannelSettingsQueryScript,
      { key: toDefinitionKey(args.key) }
    );
    return settings.map((setting) => ({
      ...setting,
      channel: toGraphQLChannel(setting.channel),
    }));
  }

  async template(args: NotificationsQueryTemplateArgs) {
    const template = await runQueryScript(
      this.$ctx,
      NotificationTemplateQueryScript,
      {
        key: toDefinitionKey(args.key),
        channel: toDomainChannel(args.channel),
        locale: args.locale,
      }
    );
    return toGraphQLEffectiveTemplate(template);
  }

  staffRecipients() {
    return runQueryScript(this.$ctx, StaffRecipientsQueryScript, {});
  }

  async providerRoutes() {
    const routes = await runQueryScript(
      this.$ctx,
      NotificationProviderRoutesQueryScript,
      {}
    );
    return routes.map((route) => ({
      ...route,
      channel: toGraphQLChannel(route.channel),
    }));
  }

  async providerConfiguration(
    args: NotificationsQueryProviderConfigurationArgs
  ) {
    const configuration = await runQueryScript(
      this.$ctx,
      NotificationProviderConfigurationQueryScript,
      { channel: toDomainChannel(args.channel) }
    );
    return {
      ...configuration,
      channel: toGraphQLChannel(configuration.channel),
    };
  }

  async webhookCapabilities() {
    const capabilities = await runQueryScript(
      this.$ctx,
      NotificationWebhookCapabilitiesQueryScript,
      {}
    );
    return {
      events: capabilities.events,
      apiVersions: capabilities.apiVersions.map((version) => ({
        ...version,
        stability: toGraphQLWebhookStability(version.stability),
      })),
    };
  }

  async webhookSubscriptions() {
    const webhooks = await runQueryScript(
      this.$ctx,
      NotificationWebhooksQueryScript,
      {}
    );
    return webhooks.map(toGraphQLWebhook);
  }
}
