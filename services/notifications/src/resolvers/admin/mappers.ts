import type {
  NotificationAudience as DomainNotificationAudience,
  NotificationChannel as DomainNotificationChannel,
  NotificationDefinitionKey,
  NotificationTemplateVariable,
} from "@shopana/broker-types";
import type { NotificationEffectiveTemplateView } from "../../scripts/template/dto/index.js";
import {
  NotificationAudience,
  NotificationChannel,
  NotificationWebhookApiStability,
  NotificationWebhookFormat,
  NotificationWebhookStatus,
  type NotificationEffectiveTemplate,
  type NotificationTemplateVariable as GraphQLNotificationTemplateVariable,
  type NotificationWebhookSubscription,
} from "./generated/types.js";

export function toDefinitionKey(value: string): NotificationDefinitionKey {
  return value as NotificationDefinitionKey;
}

export function toDomainChannel(
  value: NotificationChannel
): DomainNotificationChannel {
  switch (value) {
    case NotificationChannel.Email:
      return "EMAIL";
    case NotificationChannel.Sms:
      return "SMS";
    case NotificationChannel.Webhook:
      return "WEBHOOK";
  }
}

export function toGraphQLChannel(
  value: DomainNotificationChannel
): NotificationChannel {
  switch (value) {
    case "EMAIL":
      return NotificationChannel.Email;
    case "SMS":
      return NotificationChannel.Sms;
    case "WEBHOOK":
      return NotificationChannel.Webhook;
  }
}

export function toGraphQLAudience(
  value: DomainNotificationAudience
): NotificationAudience {
  return value === "CUSTOMER"
    ? NotificationAudience.Customer
    : NotificationAudience.Staff;
}

export function toDomainWebhookFormat(
  value: NotificationWebhookFormat
): "JSON" | "XML" {
  return value === NotificationWebhookFormat.Json ? "JSON" : "XML";
}

export function toDomainWebhookStatus(
  value: NotificationWebhookStatus
): "ACTIVE" | "DISABLED" {
  return value === NotificationWebhookStatus.Active ? "ACTIVE" : "DISABLED";
}

export function toGraphQLWebhook(
  webhook: {
    id: string;
    eventType: string;
    format: "JSON" | "XML";
    url: string;
    apiVersion: string;
    status: "ACTIVE" | "DISABLED";
    version: number;
    createdAt: string;
    updatedAt: string;
  }
): NotificationWebhookSubscription {
  return {
    ...webhook,
    format:
      webhook.format === "JSON"
        ? NotificationWebhookFormat.Json
        : NotificationWebhookFormat.Xml,
    status:
      webhook.status === "ACTIVE"
        ? NotificationWebhookStatus.Active
        : NotificationWebhookStatus.Disabled,
  };
}

export function toGraphQLWebhookStability(
  value: "UNSTABLE" | "STABLE" | "DEPRECATED"
): NotificationWebhookApiStability {
  switch (value) {
    case "UNSTABLE":
      return NotificationWebhookApiStability.Unstable;
    case "STABLE":
      return NotificationWebhookApiStability.Stable;
    case "DEPRECATED":
      return NotificationWebhookApiStability.Deprecated;
  }
}

export function toGraphQLEffectiveTemplate(
  template: NotificationEffectiveTemplateView
): NotificationEffectiveTemplate {
  return {
    key: template.key,
    channel: toGraphQLChannel(template.channel),
    locale: template.locale,
    source: template.source,
    subjectTemplate: template.subjectTemplate ?? null,
    bodyTemplate: template.bodyTemplate,
    plainTextTemplate: template.plainTextTemplate ?? null,
    revisionId: template.revisionId ?? null,
    revision: template.revision ?? null,
    pointerVersion: template.pointerVersion ?? null,
    sourceVersion: template.sourceVersion ?? null,
  };
}

export function toGraphQLTemplateVariable(
  variable: NotificationTemplateVariable
): GraphQLNotificationTemplateVariable {
  return {
    path: variable.path,
    type: variable.type,
    required: variable.required,
    description: variable.description,
    children: variable.children?.map(toGraphQLTemplateVariable) ?? null,
  };
}

export function optional<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

export function optionalStringRecord(
  value: Record<string, unknown> | null | undefined
): Record<string, string> | undefined {
  if (value === null || value === undefined) return undefined;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, String(entry)])
  );
}
