import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import {
  NotificationChannelSetEnabledScript,
  NotificationDefinitionSetEnabledScript,
  NotificationPreviewScript,
  NotificationSendTestScript,
  NotificationTemplateUpdateScript,
  NotificationWebhookCreateScript,
  NotificationWebhookDeleteScript,
  NotificationWebhookSecretRevealScript,
  NotificationWebhookUpdateScript,
  StaffRecipientDeleteScript,
  StaffRecipientUpsertScript,
} from "../../scripts/index.js";
import {
  NotificationChannelSettingInputSchema,
  NotificationDefinitionSetEnabledInputSchema,
  NotificationPreviewInputSchema,
  NotificationTemplateUpdateInputSchema,
  NotificationTestMessageInputSchema,
  NotificationWebhookCreateInputSchema,
  NotificationWebhookDeleteInputSchema,
  NotificationWebhookUpdateInputSchema,
  StaffNotificationRecipientInputSchema,
  StaffRecipientDeleteInputSchema,
} from "./generated/schemas.js";
import type {
  NotificationsMutationCreateWebhookArgs,
  NotificationsMutationDeleteStaffRecipientArgs,
  NotificationsMutationDeleteWebhookArgs,
  NotificationsMutationPreviewArgs,
  NotificationsMutationSendTestArgs,
  NotificationsMutationSetChannelEnabledArgs,
  NotificationsMutationSetDefinitionEnabledArgs,
  NotificationsMutationUpdateTemplateArgs,
  NotificationsMutationUpdateWebhookArgs,
  NotificationsMutationUpsertStaffRecipientArgs,
} from "./generated/types.js";
import {
  optional,
  toDefinitionKey,
  toDomainChannel,
  toDomainWebhookFormat,
  toDomainWebhookStatus,
  toGraphQLChannel,
} from "./mappers.js";
import { NotificationsType } from "./NotificationsType.js";

@ApolloMutation
export class MutationResolver extends NotificationsType<Record<string, never>> {
  notificationsMutation() {
    return new NotificationsMutationResolver({}, this.$ctx);
  }
}

export class NotificationsMutationResolver extends NotificationsType<Record<string, never>> {
  @ZodResolver(NotificationDefinitionSetEnabledInputSchema())
  async setDefinitionEnabled(args: NotificationsMutationSetDefinitionEnabledArgs) {
    const result = await this.$ctx.kernel.runScript(NotificationDefinitionSetEnabledScript, {
      key: toDefinitionKey(args.input.key),
      enabled: args.input.enabled,
      expectedVersion: args.input.expectedVersion,
    });
    if (result.setting) {
      const key = toDefinitionKey(result.setting.definitionKey);
      this.$ctx.loaders.definitionSetting.clear(key).prime(key, result.setting);
    }
    return {
      setting: result.setting
        ? await this.resolvers.notificationDefinitionSetting(
            toDefinitionKey(result.setting.definitionKey),
          )
        : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(NotificationChannelSettingInputSchema())
  async setChannelEnabled(args: NotificationsMutationSetChannelEnabledArgs) {
    const result = await this.$ctx.kernel.runScript(NotificationChannelSetEnabledScript, {
      key: toDefinitionKey(args.input.key),
      channel: toDomainChannel(args.input.channel),
      enabled: args.input.enabled,
      expectedVersion: args.input.expectedVersion,
      senderName: optional(args.input.senderName),
      senderEmail: optional(args.input.senderEmail),
      replyTo: optional(args.input.replyTo),
    });
    if (result.setting) {
      const key = {
        key: toDefinitionKey(result.setting.definitionKey),
        channel: result.setting.channel,
      };
      this.$ctx.loaders.channelSetting.clear(key).prime(key, result.setting);
    }
    return {
      setting: result.setting
        ? await this.resolvers.notificationChannelSetting({
            key: toDefinitionKey(result.setting.definitionKey),
            channel: result.setting.channel,
          })
        : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(NotificationTemplateUpdateInputSchema())
  async updateTemplate(args: NotificationsMutationUpdateTemplateArgs) {
    const result = await this.$ctx.kernel.runScript(NotificationTemplateUpdateScript, {
      key: toDefinitionKey(args.input.key),
      channel: toDomainChannel(args.input.channel),
      locale: args.input.locale,
      subjectTemplate: optional(args.input.subjectTemplate),
      bodyTemplate: args.input.bodyTemplate,
      plainTextTemplate: optional(args.input.plainTextTemplate),
      expectedVersion: args.input.expectedVersion,
    });
    if (result.template) {
      const key = {
        key: result.template.key,
        channel: result.template.channel,
        locale: result.template.locale,
      };
      this.$ctx.loaders.effectiveTemplate.clear(key).prime(key, result.template);
    }
    return {
      template: result.template
        ? await this.resolvers.notificationEffectiveTemplate({
            key: result.template.key,
            channel: result.template.channel,
            locale: result.template.locale,
          })
        : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(NotificationPreviewInputSchema())
  async preview(args: NotificationsMutationPreviewArgs) {
    const result = await this.$ctx.kernel.runScript(NotificationPreviewScript, {
      key: toDefinitionKey(args.input.key),
      channel: toDomainChannel(args.input.channel),
      locale: optional(args.input.locale),
      data: args.input.data,
      subjectTemplate: optional(args.input.subjectTemplate),
      bodyTemplate: optional(args.input.bodyTemplate),
      plainTextTemplate: optional(args.input.plainTextTemplate),
    });
    return {
      preview: result.preview ?? null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(StaffNotificationRecipientInputSchema())
  async upsertStaffRecipient(args: NotificationsMutationUpsertStaffRecipientArgs) {
    const result = await this.$ctx.kernel.runScript(StaffRecipientUpsertScript, {
      id: optional(args.input.id),
      userId: optional(args.input.userId),
      name: args.input.name,
      email: args.input.email,
      locale: args.input.locale,
      timezone: args.input.timezone,
      enabled: args.input.enabled,
      eventKeys: args.input.eventKeys.map(toDefinitionKey),
    });
    return {
      recipient: result.recipient ? await this.resolvers.staffRecipient(result.recipient) : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(StaffRecipientDeleteInputSchema())
  async deleteStaffRecipient(args: NotificationsMutationDeleteStaffRecipientArgs) {
    const result = await this.$ctx.kernel.runScript(StaffRecipientDeleteScript, {
      id: args.input.id,
    });
    return {
      deletedStaffRecipientId: result.deletedStaffRecipientId ?? null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(NotificationTestMessageInputSchema())
  async sendTest(args: NotificationsMutationSendTestArgs) {
    const result = await this.$ctx.kernel.runScript(NotificationSendTestScript, {
      channel: toDomainChannel(args.input.channel),
      key: toDefinitionKey(args.input.key),
      recipient: {
        recipientId: optional(args.input.recipientId),
        customerId: optional(args.input.customerId),
        userId: optional(args.input.userId),
        email: optional(args.input.email),
        phone: optional(args.input.phone),
        name: optional(args.input.name),
        locale: optional(args.input.locale),
      },
      locale: optional(args.input.locale),
      data: args.input.data,
      idempotencyKey: args.input.idempotencyKey,
    });
    return {
      workflow: result.workflow ?? null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(NotificationWebhookCreateInputSchema())
  async createWebhook(args: NotificationsMutationCreateWebhookArgs) {
    const result = await this.$ctx.kernel.runScript(NotificationWebhookCreateScript, {
      eventType: args.input.eventType,
      format: toDomainWebhookFormat(args.input.format),
      url: args.input.url,
      apiVersion: args.input.apiVersion,
    });
    if (result.webhook) {
      this.$ctx.loaders.webhook.clear(result.webhook.id).prime(result.webhook.id, result.webhook);
    }
    return {
      webhook: result.webhook ? await this.resolvers.webhook(result.webhook.id) : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(NotificationWebhookUpdateInputSchema())
  async updateWebhook(args: NotificationsMutationUpdateWebhookArgs) {
    const result = await this.$ctx.kernel.runScript(NotificationWebhookUpdateScript, {
      id: args.input.id,
      eventType: optional(args.input.eventType),
      format: args.input.format ? toDomainWebhookFormat(args.input.format) : undefined,
      url: optional(args.input.url),
      apiVersion: optional(args.input.apiVersion),
      status: args.input.status ? toDomainWebhookStatus(args.input.status) : undefined,
      expectedVersion: args.input.expectedVersion,
    });
    if (result.webhook) {
      this.$ctx.loaders.webhook.clear(result.webhook.id).prime(result.webhook.id, result.webhook);
    }
    return {
      webhook: result.webhook ? await this.resolvers.webhook(result.webhook.id) : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(NotificationWebhookDeleteInputSchema())
  async deleteWebhook(args: NotificationsMutationDeleteWebhookArgs) {
    const result = await this.$ctx.kernel.runScript(NotificationWebhookDeleteScript, {
      id: args.input.id,
    });
    if (result.deletedWebhookId) {
      this.$ctx.loaders.webhook.clear(result.deletedWebhookId);
    }
    return {
      deletedWebhookId: result.deletedWebhookId ?? null,
      userErrors: result.userErrors,
    };
  }

  async revealWebhookSecret() {
    const result = await this.$ctx.kernel.runScript(NotificationWebhookSecretRevealScript, {});
    return {
      secret: result.secret ?? null,
      userErrors: result.userErrors,
    };
  }
}
