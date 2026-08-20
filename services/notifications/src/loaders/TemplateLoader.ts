import type { NotificationChannel, NotificationDefinitionKey } from "@shopana/broker-types";
import DataLoader from "dataloader";
import type { NotificationTemplateRenderer } from "../infrastructure/templates/NotificationTemplateRenderer.js";

export interface EffectiveTemplateKey {
  key: NotificationDefinitionKey;
  channel: NotificationChannel;
  locale: string;
}

export function effectiveTemplateKey(key: EffectiveTemplateKey): string {
  return JSON.stringify([key.key, key.channel, key.locale]);
}

export class TemplateLoader {
  public readonly effectiveTemplate;

  constructor(renderer: NotificationTemplateRenderer) {
    this.effectiveTemplate = new DataLoader<
      EffectiveTemplateKey,
      Awaited<ReturnType<NotificationTemplateRenderer["getEffectiveTemplate"]>>,
      string
    >((keys) => renderer.getEffectiveTemplates(keys), { cacheKeyFn: effectiveTemplateKey });
  }
}
