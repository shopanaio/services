import type { WebhookRepository } from "../../../repositories/webhooks/WebhookRepository.js";
import type { WEBHOOK_API_VERSIONS } from "../../../infrastructure/webhooks/WebhookCapabilities.js";

export interface NotificationWebhookCreateParams {
  eventType: string;
  format: "JSON" | "XML";
  url: string;
  apiVersion: string;
}

export interface NotificationWebhookUpdateParams {
  id: string;
  eventType?: string;
  format?: "JSON" | "XML";
  url?: string;
  apiVersion?: string;
  status?: "ACTIVE" | "DISABLED";
  expectedVersion: number;
}

export type NotificationWebhookView = Awaited<ReturnType<WebhookRepository["create"]>>;

export type NotificationWebhookListView = Awaited<ReturnType<WebhookRepository["list"]>>;

export interface NotificationWebhookCapabilitiesView {
  events: Array<{ eventType: string; title: string }>;
  apiVersions: typeof WEBHOOK_API_VERSIONS;
}
