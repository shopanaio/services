import type {
  NotificationChannel,
  NotificationDefinitionKey,
} from "@shopana/broker-types";
import type { TemplateDefinitionRegistry } from "../infrastructure/templates/TemplateDefinitionRegistry.js";

export interface DefaultTemplate {
  key: NotificationDefinitionKey;
  channel: Extract<NotificationChannel, "EMAIL" | "SMS">;
  locale: "en";
  sourceVersion: "architecture-defaults-v1";
  subjectTemplate?: string;
  bodyTemplate: string;
  plainTextTemplate?: string;
}

export function createDefaultTemplateManifest(
  definitions: TemplateDefinitionRegistry
): ReadonlyMap<string, DefaultTemplate> {
  const templates = new Map<string, DefaultTemplate>();
  for (const definition of definitions.list()) {
    const text = `${definition.title} from {{store.displayName}}.`;
    templates.set(templateId(definition.key, "EMAIL", "en"), {
      key: definition.key,
      channel: "EMAIL",
      locale: "en",
      sourceVersion: "architecture-defaults-v1",
      subjectTemplate: `${definition.title} — {{store.displayName}}`,
      bodyTemplate: `<p>${text}</p>`,
      plainTextTemplate: text,
    });
    templates.set(templateId(definition.key, "SMS", "en"), {
      key: definition.key,
      channel: "SMS",
      locale: "en",
      sourceVersion: "architecture-defaults-v1",
      bodyTemplate: text,
    });
  }
  return templates;
}

export function templateId(
  key: NotificationDefinitionKey,
  channel: NotificationChannel,
  locale: string
): string {
  return `${key}:${channel}:${locale}`;
}
