import type {
  NotificationAudience as DomainNotificationAudience,
  NotificationChannel as DomainNotificationChannel,
  NotificationDefinitionKey,
  NotificationTemplateVariable,
} from "@shopana/broker-types";
import {
  NotificationAudience,
  NotificationChannel,
  NotificationWebhookApiStability,
  NotificationWebhookFormat,
  NotificationWebhookStatus,
  type NotificationTemplateVariable as GraphQLNotificationTemplateVariable,
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
