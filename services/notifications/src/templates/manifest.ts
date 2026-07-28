import type {
  NotificationChannel,
  NotificationDefinitionKey,
} from "@shopana/broker-types";
import type { TemplateDefinitionRegistry } from "../infrastructure/templates/TemplateDefinitionRegistry.js";

export interface DefaultTemplate {
  key: NotificationDefinitionKey;
  channel: Extract<NotificationChannel, "EMAIL" | "SMS">;
  locale: "en";
  sourceVersion: "architecture-defaults-v2";
  subjectTemplate?: string;
  bodyTemplate: string;
  plainTextTemplate?: string;
}

export function createDefaultTemplateManifest(
  definitions: TemplateDefinitionRegistry
): ReadonlyMap<string, DefaultTemplate> {
  const templates = new Map<string, DefaultTemplate>();
  for (const definition of definitions.list()) {
    const applicationAuthTemplates = createApplicationAuthTemplates(
      definition.key
    );
    if (applicationAuthTemplates) {
      for (const template of applicationAuthTemplates) {
        templates.set(
          templateId(template.key, template.channel, "en"),
          template
        );
      }
      continue;
    }
    const text = `${definition.title} from {{store.displayName}}.`;
    templates.set(templateId(definition.key, "EMAIL", "en"), {
      key: definition.key,
      channel: "EMAIL",
      locale: "en",
      sourceVersion: "architecture-defaults-v2",
      subjectTemplate: `${definition.title} — {{store.displayName}}`,
      bodyTemplate: `<p>${text}</p>`,
      plainTextTemplate: text,
    });
    templates.set(templateId(definition.key, "SMS", "en"), {
      key: definition.key,
      channel: "SMS",
      locale: "en",
      sourceVersion: "architecture-defaults-v2",
      bodyTemplate: text,
    });
  }
  return templates;
}

function createApplicationAuthTemplates(
  key: NotificationDefinitionKey
): readonly DefaultTemplate[] | null {
  switch (key) {
    case "customer.auth.email_verification":
      return authLinkTemplates(
        key,
        "Verify your email",
        "Verify your email for",
        "authentication.url"
      );
    case "customer.auth.login_code":
      return [
        {
          key,
          channel: "EMAIL",
          locale: "en",
          sourceVersion: "architecture-defaults-v2",
          subjectTemplate: "Your sign-in code — {{store.displayName}}",
          bodyTemplate:
            "<p>Your sign-in code for {{store.displayName}} is <strong>{{authentication.otp}}</strong>.</p>",
          plainTextTemplate:
            "Your sign-in code for {{store.displayName}} is {{authentication.otp}}.",
        },
        {
          key,
          channel: "SMS",
          locale: "en",
          sourceVersion: "architecture-defaults-v2",
          bodyTemplate:
            "{{authentication.otp}} is your sign-in code for {{store.displayName}}.",
        },
      ];
    case "customer.auth.password_reset":
      return authLinkTemplates(
        key,
        "Reset your password",
        "Reset your password for",
        "authentication.url"
      );
    default:
      return null;
  }
}

function authLinkTemplates(
  key:
    | "customer.auth.email_verification"
    | "customer.auth.password_reset",
  subject: string,
  action: string,
  urlPath: "authentication.url"
): readonly DefaultTemplate[] {
  return [
    {
      key,
      channel: "EMAIL",
      locale: "en",
      sourceVersion: "architecture-defaults-v2",
      subjectTemplate: `${subject} — {{store.displayName}}`,
      bodyTemplate: `<p>${action} {{store.displayName}}: <a href="{{${urlPath}}}">{{${urlPath}}}</a></p>`,
      plainTextTemplate: `${action} {{store.displayName}}: {{${urlPath}}}`,
    },
    {
      key,
      channel: "SMS",
      locale: "en",
      sourceVersion: "architecture-defaults-v2",
      bodyTemplate: `${action} {{store.displayName}}: {{${urlPath}}}`,
    },
  ];
}

export function templateId(
  key: NotificationDefinitionKey,
  channel: NotificationChannel,
  locale: string
): string {
  return `${key}:${channel}:${locale}`;
}
