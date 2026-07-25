import { WEBHOOK_API_VERSIONS } from "../../infrastructure/webhooks/WebhookCapabilities.js";
import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type { NotificationWebhookCapabilitiesView } from "./dto/index.js";

export class NotificationWebhookCapabilitiesQueryScript extends BaseAdminScript<
  Record<string, never>,
  NotificationWebhookCapabilitiesView
> {
  protected async execute(): Promise<NotificationWebhookCapabilitiesView> {
    return {
      events: this.definitions.listEventTypes().map((eventType) => ({
        eventType,
        title: humanizeEventType(eventType),
      })),
      apiVersions: WEBHOOK_API_VERSIONS,
    };
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
