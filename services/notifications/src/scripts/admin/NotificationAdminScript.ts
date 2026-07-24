import type {
  Apps,
  Notifications,
} from "@shopana/broker-types";
import { z } from "zod";
import {
  WEBHOOK_API_VERSIONS,
  isSupportedWebhookApiVersion,
} from "../../infrastructure/webhooks/WebhookCapabilities.js";
import { BaseScript } from "../../kernel/BaseScript.js";

export type NotificationAdminParams =
  | { operation: "overview" }
  | { operation: "definitions" }
  | {
      operation: "channelSettings";
      key: Notifications.NotificationDefinitionKey;
    }
  | {
      operation: "setDefinitionEnabled";
      key: Notifications.NotificationDefinitionKey;
      enabled: boolean;
      expectedVersion: number;
    }
  | {
      operation: "setChannelEnabled";
      key: Notifications.NotificationDefinitionKey;
      channel: Notifications.NotificationChannel;
      enabled: boolean;
      expectedVersion: number;
      senderName?: string;
      senderEmail?: string;
      replyTo?: string;
    }
  | {
      operation: "templateRevisions";
      key: Notifications.NotificationDefinitionKey;
      channel: Notifications.NotificationChannel;
      locale: string;
    }
  | {
      operation: "template";
      key: Notifications.NotificationDefinitionKey;
      channel: Notifications.NotificationChannel;
      locale: string;
    }
  | {
      operation: "createTemplateRevision";
      key: Notifications.NotificationDefinitionKey;
      channel: Notifications.NotificationChannel;
      locale: string;
      subjectTemplate?: string;
      bodyTemplate: string;
      plainTextTemplate?: string;
    }
  | {
      operation: "activateTemplateRevision";
      revisionId: string;
      expectedVersion: number;
    }
  | {
      operation: "validateTemplate";
      input: {
        key: Notifications.NotificationDefinitionKey;
        channel: Notifications.NotificationChannel;
        subjectTemplate?: string;
        bodyTemplate: string;
        plainTextTemplate?: string;
      };
    }
  | {
      operation: "preview";
      input: Omit<Notifications.PreviewNotificationParams, "storeId">;
    }
  | { operation: "staffRecipients" }
  | {
      operation: "upsertStaffRecipient";
      input: {
        id?: string;
        userId?: string;
        name: string;
        email: string;
        locale: string;
        timezone: string;
        enabled: boolean;
        eventKeys: Notifications.NotificationDefinitionKey[];
      };
    }
  | { operation: "deleteStaffRecipient"; id: string }
  | { operation: "providerRoutes" }
  | {
      operation: "providerConfiguration";
      channel: Notifications.NotificationChannel;
    }
  | {
      operation: "configureProvider";
      input: Omit<Apps.ConfigureNotificationProviderParams, "storeId">;
    }
  | {
      operation: "testProvider";
      channel: Notifications.NotificationChannel;
      recipient?: string;
    }
  | {
      operation: "sendTest";
      input: Omit<
        Notifications.SendTestNotificationParams,
        "storeId" | "organizationId"
      >;
    }
  | { operation: "webhookCapabilities" }
  | { operation: "webhookSecretStatus" }
  | { operation: "webhooks" }
  | {
      operation: "createWebhook";
      eventType: string;
      format: "JSON" | "XML";
      url: string;
      apiVersion: string;
    }
  | {
      operation: "updateWebhook";
      id: string;
      eventType?: string;
      format?: "JSON" | "XML";
      url?: string;
      apiVersion?: string;
      status?: "ACTIVE" | "DISABLED";
      expectedVersion: number;
    }
  | { operation: "deleteWebhook"; id: string }
  | {
      operation: "rotateWebhookSecret";
      gracePeriodHours?: number;
    }
  | { operation: "revealWebhookSecret" }
  | { operation: "deliveries"; limit?: number }
  | { operation: "deliveryAttempts"; deliveryId: string }
  | {
      operation: "retryDelivery";
      deliveryId: string;
      idempotencyKey: string;
    }
  | { operation: "cancelDelivery"; deliveryId: string };

export class NotificationAdminScript extends BaseScript<
  NotificationAdminParams,
  unknown
> {
  protected async execute(params: NotificationAdminParams): Promise<unknown> {
    await this.authorize(params);
    const actorId = this.context.user.id;
    switch (params.operation) {
      case "overview": {
        const [settings, channels, staff, webhooks, deliveries, operational] =
          await Promise.all([
            this.repository.settings.listDefinitionSettings(),
            this.repository.settings.listChannelSettings(),
            this.repository.staff.list(),
            this.repository.webhooks.list(),
            this.repository.deliveries.listDeliveries(25),
            this.repository.deliveries.getOperationalSnapshot(),
          ]);
        return {
          definitions: this.effectiveDefinitions(settings, channels),
          staffRecipientCount: staff.filter((entry) => entry.enabled).length,
          webhookCount: webhooks.filter(
            (entry) => entry.status === "ACTIVE"
          ).length,
          recentDeliveryCount: deliveries.length,
          deliveryCounts: operational.counts,
          queueDepth: operational.queueDepth,
          oldestPendingAt: operational.oldestPendingAt,
        };
      }
      case "definitions": {
        const [settings, channels] = await Promise.all([
          this.repository.settings.listDefinitionSettings(),
          this.repository.settings.listChannelSettings(),
        ]);
        return this.effectiveDefinitions(settings, channels);
      }
      case "channelSettings": {
        const definition = this.definitions.get(params.key);
        const settings =
          await this.repository.settings.listChannelSettings(params.key);
        return definition.allowedChannels.map((channel) => {
          const setting = settings.find((entry) => entry.channel === channel);
          return setting ?? {
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
      case "setDefinitionEnabled": {
        const definition = this.definitions.get(params.key);
        if (!definition.optional && !params.enabled) {
          throw new Error("MANDATORY_NOTIFICATION_CANNOT_BE_DISABLED");
        }
        const setting = await this.repository.settings.setDefinitionEnabled({
          ...params,
          updatedBy: actorId,
        });
        await this.audit("definition.setting.updated", "definition", params.key, {
          enabled: params.enabled,
          version: setting.version,
        });
        return setting;
      }
      case "setChannelEnabled": {
        const definition = this.definitions.get(params.key);
        if (!definition.allowedChannels.includes(params.channel)) {
          throw new Error("CHANNEL_NOT_ALLOWED");
        }
        if (
          params.channel !== "EMAIL" &&
          (params.senderEmail || params.senderName || params.replyTo)
        ) {
          throw new Error("SENDER_SETTINGS_REQUIRE_EMAIL_CHANNEL");
        }
        if (params.senderEmail) {
          z.string().email().parse(params.senderEmail);
        }
        if (params.replyTo) {
          z.string().email().parse(params.replyTo);
        }
        const setting = await this.repository.settings.setChannelEnabled(params);
        await this.audit(
          "channel.setting.updated",
          "definition",
          params.key,
          { channel: params.channel, enabled: params.enabled }
        );
        return setting;
      }
      case "templateRevisions":
        return this.repository.templates.listRevisions(
          params.key,
          params.channel,
          params.locale
        );
      case "template":
        return this.renderer.getEffectiveTemplate(params);
      case "createTemplateRevision": {
        if (params.channel !== "EMAIL" && params.channel !== "SMS") {
          throw new Error("CHANNEL_DOES_NOT_SUPPORT_TEMPLATES");
        }
        const issues = this.renderer.validateSources(params);
        if (issues.length > 0) {
          throw new Error(
            issues
              .map((issue) => `${issue.code}:${issue.message}`)
              .join("; ")
          );
        }
        const revision = await this.repository.templates.createRevision({
          ...params,
          createdBy: actorId,
        });
        await this.audit(
          "template.revision.created",
          "templateRevision",
          revision.id,
          {
            key: params.key,
            channel: params.channel,
            locale: params.locale,
            revision: revision.revision,
          }
        );
        return revision;
      }
      case "activateTemplateRevision": {
        const pointer = await this.repository.templates.activate({
          ...params,
          updatedBy: actorId,
        });
        await this.audit(
          "template.revision.activated",
          "templateRevision",
          params.revisionId,
          { version: pointer.version }
        );
        return pointer;
      }
      case "validateTemplate": {
        if (
          params.input.channel !== "EMAIL" &&
          params.input.channel !== "SMS"
        ) {
          return {
            valid: false,
            issues: [
              {
                field: "BODY",
                line: 1,
                column: 1,
                code: "CHANNEL_DOES_NOT_SUPPORT_TEMPLATES",
                message: "Only EMAIL and SMS channels support templates",
              },
            ],
          };
        }
        const issues = this.renderer.validateSourcesStructured(params.input);
        return { valid: issues.length === 0, issues };
      }
      case "preview":
        return this.renderer.preview(params.input);
      case "staffRecipients":
        return this.repository.staff.list();
      case "upsertStaffRecipient": {
        for (const key of params.input.eventKeys) {
          if (this.definitions.get(key).audience !== "STAFF") {
            throw new Error(`NOT_A_STAFF_NOTIFICATION:${key}`);
          }
        }
        const recipient = await this.repository.staff.upsert(params.input);
        await this.audit(
          params.input.id
            ? "staff.recipient.updated"
            : "staff.recipient.created",
          "staffRecipient",
          recipient.id,
          { eventKeys: recipient.eventKeys, enabled: recipient.enabled }
        );
        return recipient;
      }
      case "deleteStaffRecipient": {
        const deleted = await this.repository.staff.delete(params.id);
        if (deleted) {
          await this.audit(
            "staff.recipient.deleted",
            "staffRecipient",
            params.id
          );
        }
        return { deleted };
      }
      case "providerRoutes":
        return Promise.all(
          (["EMAIL", "SMS", "WEBHOOK"] as const).map(
            (channel) =>
              this.services.broker.call(
                "apps.getNotificationProviderRouteStatus",
                { storeId: this.context.store.id, channel }
              )
          )
        );
      case "providerConfiguration":
        return this.services.broker.call(
          "apps.getMaskedNotificationProviderConfig",
          {
            storeId: this.context.store.id,
            channel: params.channel,
          } satisfies Apps.GetMaskedNotificationProviderConfigParams
        );
      case "configureProvider": {
        const result = await this.services.broker.call(
          "apps.configureNotificationProvider",
          { ...params.input, storeId: this.context.store.id }
        );
        await this.audit(
          "provider.configured",
          "providerRoute",
          params.input.channel,
          {
            providerCode: params.input.providerCode,
            channel: params.input.channel,
          }
        );
        return result;
      }
      case "testProvider":
        return this.services.broker.call("apps.testNotificationProvider", {
          storeId: this.context.store.id,
          channel: params.channel,
          input: { channel: params.channel, recipient: params.recipient },
        });
      case "sendTest":
        return this.services.broker.call("notifications.sendTest", {
          ...params.input,
          storeId: this.context.store.id,
          organizationId: this.context.store.organizationId,
        } satisfies Notifications.SendTestNotificationParams);
      case "webhookCapabilities":
        return {
          events: this.definitions.listEventTypes().map((eventType) => ({
            eventType,
            title: humanizeEventType(eventType),
          })),
          apiVersions: WEBHOOK_API_VERSIONS,
        };
      case "webhookSecretStatus":
        return this.repository.webhooks.getSecretStatus();
      case "webhooks":
        return this.repository.webhooks.list();
      case "createWebhook": {
        this.assertWebhookCapabilities(params.eventType, params.apiVersion);
        const result = await this.repository.webhooks.create({
          ...params,
          createdBy: actorId,
        });
        await this.audit(
          "webhook.created",
          "webhook",
          result.id,
          { eventType: params.eventType, format: params.format }
        );
        return result;
      }
      case "updateWebhook": {
        if (
          params.eventType &&
          this.definitions.forEvent(params.eventType).length === 0
        ) {
          throw new Error("UNSUPPORTED_WEBHOOK_EVENT");
        }
        if (
          params.apiVersion &&
          !isSupportedWebhookApiVersion(params.apiVersion)
        ) {
          throw new Error("UNSUPPORTED_WEBHOOK_API_VERSION");
        }
        const webhook = await this.repository.webhooks.update(params);
        await this.audit("webhook.updated", "webhook", params.id, {
          version: webhook.version,
          status: webhook.status,
        });
        return webhook;
      }
      case "deleteWebhook": {
        const deleted = await this.repository.webhooks.delete(params.id);
        if (deleted) {
          await this.audit("webhook.deleted", "webhook", params.id);
        }
        return { deleted };
      }
      case "rotateWebhookSecret": {
        const secret = await this.repository.webhooks.rotateSecret(
          actorId,
          params.gracePeriodHours
        );
        await this.audit(
          "webhook.secret.rotated",
          "webhookSecret",
          this.context.store.id
        );
        return { secret };
      }
      case "revealWebhookSecret": {
        const secret = await this.repository.webhooks.revealSecret();
        await this.audit(
          "webhook.secret.revealed",
          "webhookSecret",
          this.context.store.id
        );
        return { secret };
      }
      case "deliveries":
        return this.repository.deliveries.listDeliveries(params.limit);
      case "deliveryAttempts":
        return this.repository.deliveries.listAttempts(params.deliveryId);
      case "retryDelivery":
        return this.services.broker.call("notifications.retryDelivery", {
          storeId: this.context.store.id,
          organizationId: this.context.store.organizationId,
          deliveryId: params.deliveryId,
          idempotencyKey: params.idempotencyKey,
        } satisfies Notifications.RetryNotificationDeliveryParams);
      case "cancelDelivery":
        return this.services.broker.call("notifications.cancelDelivery", {
          storeId: this.context.store.id,
          deliveryId: params.deliveryId,
        } satisfies Notifications.CancelNotificationDeliveryParams);
    }
  }

  private effectiveDefinitions(
    settings: Awaited<
      ReturnType<typeof this.repository.settings.listDefinitionSettings>
    >,
    channels: Awaited<
      ReturnType<typeof this.repository.settings.listChannelSettings>
    >
  ) {
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

  private assertWebhookCapabilities(
    eventType: string,
    apiVersion: string
  ): void {
    if (this.definitions.forEvent(eventType).length === 0) {
      throw new Error("UNSUPPORTED_WEBHOOK_EVENT");
    }
    if (!isSupportedWebhookApiVersion(apiVersion)) {
      throw new Error("UNSUPPORTED_WEBHOOK_API_VERSION");
    }
  }

  private async authorize(params: NotificationAdminParams): Promise<void> {
    const permission = permissionFor(params);
    const allowed = await this.authProvider.authorize({
      organizationId: this.context.store.organizationId,
      organizationName: this.context.store.name,
      resource: permission.resource,
      action: permission.action,
    });
    if (!allowed) throw new Error("FORBIDDEN");
  }

  private audit(
    action: string,
    entityType: string,
    entityId: string,
    payload?: Record<string, unknown>
  ) {
    return this.repository.audit.record({
      action,
      entityType,
      entityId,
      actorId: this.context.user.id,
      payload,
    });
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

function permissionFor(params: NotificationAdminParams): {
  resource: string;
  action: string;
} {
  const { operation } = params;
  if (
    operation.includes("Template") ||
    operation === "templateRevisions" ||
    operation === "template"
  ) {
    return {
      resource: "notification_template",
      action:
        operation === "templateRevisions" || operation === "template"
          ? "read"
          : operation === "validateTemplate"
            ? "preview"
          : operation === "activateTemplateRevision"
            ? "activate"
            : "update",
    };
  }
  if (operation === "preview") {
    return { resource: "notification_template", action: "preview" };
  }
  if (
    operation.includes("Provider") ||
    operation === "providerRoutes" ||
    operation === "providerConfiguration" ||
    operation === "sendTest"
  ) {
    return {
      resource: "notification_provider",
      action: operation === "testProvider" || operation === "sendTest"
        ? "test"
          : operation === "providerRoutes" ||
              operation === "providerConfiguration"
          ? "read"
          : "configure",
    };
  }
  if (
    operation.includes("Webhook") ||
    operation === "webhooks" ||
    operation === "webhookCapabilities" ||
    operation === "webhookSecretStatus"
  ) {
    return {
      resource: "notification_webhook",
      action: operation === "rotateWebhookSecret"
        ? "rotate_secret"
        : operation === "revealWebhookSecret"
          ? "reveal_secret"
        : operation === "createWebhook"
          ? "create"
          : operation === "deleteWebhook"
            ? "delete"
            : operation === "webhooks" ||
                operation === "webhookCapabilities" ||
                operation === "webhookSecretStatus"
              ? "read"
              : "update",
    };
  }
  if (
    operation.includes("Delivery") ||
    operation === "deliveries" ||
    operation === "deliveryAttempts"
  ) {
    return {
      resource: "notification_delivery",
      action: operation === "retryDelivery"
        ? "retry"
        : operation === "cancelDelivery"
          ? "cancel"
          : "read",
    };
  }
  if (
    operation.includes("Staff") ||
    operation === "staffRecipients"
  ) {
    return {
      resource: "notification_recipient",
      action: operation === "deleteStaffRecipient"
        ? "delete"
        : operation === "upsertStaffRecipient"
          ? params.input.id
            ? "update"
            : "create"
          : operation === "staffRecipients"
            ? "read"
            : "update",
    };
  }
  return {
    resource: "notification_settings",
    action:
      operation === "overview" ||
      operation === "definitions" ||
      operation === "channelSettings"
        ? "read"
        : "update",
  };
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
