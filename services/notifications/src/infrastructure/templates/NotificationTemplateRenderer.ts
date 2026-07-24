import { createHash } from "node:crypto";
import type {
  NotificationChannel,
  NotificationDefinitionKey,
  PreviewNotificationResult,
} from "@shopana/broker-types";
import type { TemplateRepository } from "../../repositories/templates/TemplateRepository.js";
import {
  createDefaultTemplateManifest,
  templateId,
  type DefaultTemplate,
} from "../../templates/manifest.js";
import { HandlebarsTemplateEngine } from "./HandlebarsTemplateEngine.js";
import { calculateSmsSegments } from "./SmsSegmentCalculator.js";
import {
  TemplateVariableValidator,
  type TemplateValidationIssue,
} from "./TemplateVariableValidator.js";
import type { TemplateDefinitionRegistry } from "./TemplateDefinitionRegistry.js";

export interface RenderedNotification {
  subject?: string;
  html?: string;
  text: string;
  locale: string;
  contentHash: string;
  templateRevisionId?: string;
  templateRevision?: number;
  templateSourceVersion?: string;
  sms?: { encoding: "GSM_7" | "UCS_2"; segmentCount: number; length: number };
}

export class NotificationTemplateRenderer {
  private readonly engine = new HandlebarsTemplateEngine();
  private readonly validator = new TemplateVariableValidator();
  private readonly defaults: ReadonlyMap<string, DefaultTemplate>;

  constructor(
    private readonly definitions: TemplateDefinitionRegistry,
    private readonly templates: TemplateRepository
  ) {
    this.defaults = createDefaultTemplateManifest(definitions);
    for (const template of this.defaults.values()) {
      const issues = this.validateSources({
        key: template.key,
        channel: template.channel,
        subjectTemplate: template.subjectTemplate,
        bodyTemplate: template.bodyTemplate,
        plainTextTemplate: template.plainTextTemplate,
      });
      if (issues.length > 0) {
        throw new Error(
          `Invalid default template ${template.key}/${template.channel}: ${issues
            .map((issue) => `${issue.code}@${issue.line}:${issue.column}`)
            .join(", ")}`
        );
      }
    }
  }

  validateSources(input: {
    key: NotificationDefinitionKey;
    channel: NotificationChannel;
    subjectTemplate?: string;
    bodyTemplate: string;
    plainTextTemplate?: string;
  }): TemplateValidationIssue[] {
    const definition = this.definitions.get(input.key);
    const issues = [
      ...(input.subjectTemplate
        ? this.validator.validate(
            input.subjectTemplate,
            definition.variables
          )
        : []),
      ...this.validator.validate(input.bodyTemplate, definition.variables),
      ...(input.plainTextTemplate
        ? this.validator.validate(
            input.plainTextTemplate,
            definition.variables
          )
        : []),
    ];
    if (input.channel === "EMAIL") {
      try {
        assertSafeEmailHtml(input.bodyTemplate);
      } catch (error) {
        issues.push({
          line: 1,
          column: 1,
          code: "UNSAFE_EMAIL_HTML",
          message:
            error instanceof Error
              ? error.message
              : "Email HTML is unsafe",
        });
      }
    }
    return issues;
  }

  async render(input: {
    key: NotificationDefinitionKey;
    channel: NotificationChannel;
    data: Record<string, unknown>;
    recipientLocale?: string;
    eventLocale?: string;
    storeDefaultLocale?: string;
  }): Promise<RenderedNotification> {
    const definition = this.definitions.get(input.key);
    const data = definition.dataSchema.parse(input.data);
    if (input.channel === "INTEGRATION") {
      const text = JSON.stringify(data);
      return {
        text,
        locale: input.recipientLocale ?? input.eventLocale ?? "en",
        contentHash: hash(text),
        templateSourceVersion: "structured-v1",
      };
    }
    if (input.channel === "WEBHOOK") {
      throw new Error("Webhook envelopes are rendered by the webhook pipeline");
    }

    const locales = unique([
      input.recipientLocale,
      input.eventLocale,
      input.storeDefaultLocale,
      "en",
    ]);
    const selected = await this.resolveTemplate(
      input.key,
      input.channel,
      locales
    );
    return this.renderSources({
      key: input.key,
      channel: input.channel,
      data,
      locale: selected.locale,
      subjectTemplate: selected.subjectTemplate,
      bodyTemplate: selected.bodyTemplate,
      plainTextTemplate: selected.plainTextTemplate,
      cachePrefix: selected.cachePrefix,
      templateRevisionId: selected.templateRevisionId,
      templateRevision: selected.templateRevision,
      templateSourceVersion: selected.templateSourceVersion,
    });
  }

  async preview(input: {
    key: NotificationDefinitionKey;
    channel: NotificationChannel;
    locale?: string;
    data: Record<string, unknown>;
    subjectTemplate?: string;
    bodyTemplate?: string;
    plainTextTemplate?: string;
  }): Promise<PreviewNotificationResult> {
    const definition = this.definitions.get(input.key);
    const data = definition.dataSchema.parse(input.data);
    if (input.bodyTemplate !== undefined) {
      const issues = this.validateSources({
        key: input.key,
        channel: input.channel,
        subjectTemplate: input.subjectTemplate,
        bodyTemplate: input.bodyTemplate,
        plainTextTemplate: input.plainTextTemplate,
      });
      if (issues.length > 0) {
        throw new Error(
          issues.map((issue) => `${issue.code}@${issue.line}:${issue.column} ${issue.message}`).join("; ")
        );
      }
      const rendered = this.renderSources({
        key: input.key,
        channel: input.channel,
        data,
        locale: input.locale ?? "en",
        subjectTemplate: input.subjectTemplate,
        bodyTemplate: input.bodyTemplate,
        plainTextTemplate: input.plainTextTemplate,
        cachePrefix: `preview:${hash(
          JSON.stringify([
            input.subjectTemplate,
            input.bodyTemplate,
            input.plainTextTemplate,
          ])
        )}`,
      });
      return {
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        locale: rendered.locale,
        warnings: [],
        sms: rendered.sms,
      };
    }
    const rendered = await this.render({
      key: input.key,
      channel: input.channel,
      data,
      recipientLocale: input.locale,
    });
    return {
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      locale: rendered.locale,
      warnings: [],
      sms: rendered.sms,
    };
  }

  async getEffectiveTemplate(input: {
    key: NotificationDefinitionKey;
    channel: NotificationChannel;
    locale: string;
  }) {
    if (input.channel !== "EMAIL" && input.channel !== "SMS") {
      throw new Error("CHANNEL_DOES_NOT_SUPPORT_TEMPLATES");
    }
    const selected = await this.resolveTemplate(
      input.key,
      input.channel,
      unique([input.locale, "en"])
    );
    return {
      key: input.key,
      channel: input.channel,
      locale: selected.locale,
      source: selected.templateRevisionId ? "REVISION" : "DEFAULT",
      subjectTemplate: selected.subjectTemplate,
      bodyTemplate: selected.bodyTemplate,
      plainTextTemplate: selected.plainTextTemplate,
      revisionId: selected.templateRevisionId,
      revision: selected.templateRevision,
      pointerVersion: selected.pointerVersion,
      sourceVersion: selected.templateSourceVersion,
    };
  }

  private renderSources(input: {
    key: NotificationDefinitionKey;
    channel: NotificationChannel;
    data: Record<string, unknown>;
    locale: string;
    subjectTemplate?: string;
    bodyTemplate: string;
    plainTextTemplate?: string;
    cachePrefix: string;
    templateRevisionId?: string;
    templateRevision?: number;
    templateSourceVersion?: string;
  }): RenderedNotification {
    const subject = input.subjectTemplate
      ? this.engine.render(
          input.subjectTemplate,
          input.data,
          `${input.cachePrefix}:subject`
        )
      : undefined;
    const body = this.engine.render(
      input.bodyTemplate,
      input.data,
      `${input.cachePrefix}:body`
    );
    if (input.channel === "EMAIL") {
      assertSafeEmailHtml(body);
      const text = input.plainTextTemplate
        ? this.engine.render(
            input.plainTextTemplate,
            input.data,
            `${input.cachePrefix}:text`
          )
        : htmlToText(body);
      const contentHash = hash(JSON.stringify({ subject, html: body, text }));
      return {
        subject,
        html: body,
        text,
        locale: input.locale,
        contentHash,
        templateRevisionId: input.templateRevisionId,
        templateRevision: input.templateRevision,
        templateSourceVersion: input.templateSourceVersion,
      };
    }
    if (input.channel === "SMS") {
      const sms = calculateSmsSegments(body);
      return {
        text: body,
        locale: input.locale,
        contentHash: hash(body),
        templateRevisionId: input.templateRevisionId,
        templateRevision: input.templateRevision,
        templateSourceVersion: input.templateSourceVersion,
        sms,
      };
    }
    throw new Error(`Unsupported template channel ${input.channel}`);
  }

  private async resolveTemplate(
    key: NotificationDefinitionKey,
    channel: Extract<NotificationChannel, "EMAIL" | "SMS">,
    locales: string[]
  ) {
    for (const locale of locales) {
      const active = await this.templates.findActive(key, channel, locale);
      if (active) {
        return {
          locale,
          subjectTemplate: active.revision.subjectTemplate ?? undefined,
          bodyTemplate: active.revision.bodyTemplate,
          plainTextTemplate:
            active.revision.plainTextTemplate ?? undefined,
          cachePrefix: `revision:${active.revision.id}:${active.revision.sourceHash}`,
          templateRevisionId: active.revision.id,
          templateRevision: active.revision.revision,
          pointerVersion: active.pointerVersion,
        };
      }
    }
    for (const locale of locales) {
      const fallback =
        this.defaults.get(templateId(key, channel, locale)) ??
        this.defaults.get(templateId(key, channel, "en"));
      if (fallback) {
        return {
          locale: fallback.locale,
          subjectTemplate: fallback.subjectTemplate,
          bodyTemplate: fallback.bodyTemplate,
          plainTextTemplate: fallback.plainTextTemplate,
          cachePrefix: `default:${fallback.sourceVersion}:${key}:${channel}`,
          templateSourceVersion: fallback.sourceVersion,
        };
      }
    }
    throw new Error(`No template found for ${key}/${channel}`);
  }
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertSafeEmailHtml(html: string): void {
  if (
    /<\s*(script|iframe|object|embed|form)\b/i.test(html) ||
    /\son[a-z]+\s*=/i.test(html) ||
    /\bjavascript\s*:/i.test(html)
  ) {
    throw new Error("Rendered email HTML contains unsafe markup");
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
