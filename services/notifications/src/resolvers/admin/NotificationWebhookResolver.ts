import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { WebhookRepository } from "../../repositories/webhooks/WebhookRepository.js";
import { NotificationsType } from "./NotificationsType.js";
import { NotificationWebhookFormat, NotificationWebhookStatus } from "./generated/types.js";

type NotificationWebhook = NonNullable<Awaited<ReturnType<WebhookRepository["find"]>>>;

export class NotificationWebhookResolver extends NotificationsType<string, NotificationWebhook> {
  async $preload() {
    const webhook = await this.$ctx.loaders.webhook.load(this.$props);
    if (!webhook) {
      throw new PreloadNotFoundError(`Notification webhook ${this.$props} not found`);
    }
    return webhook;
  }

  id() {
    return this.$props;
  }
  eventType() {
    return this.$get("eventType");
  }
  async format() {
    return (await this.$get("format")) === "JSON"
      ? NotificationWebhookFormat.Json
      : NotificationWebhookFormat.Xml;
  }
  url() {
    return this.$get("url");
  }
  apiVersion() {
    return this.$get("apiVersion");
  }
  async status() {
    return (await this.$get("status")) === "ACTIVE"
      ? NotificationWebhookStatus.Active
      : NotificationWebhookStatus.Disabled;
  }
  version() {
    return this.$get("version");
  }
  createdAt() {
    return this.$get("createdAt");
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
}
