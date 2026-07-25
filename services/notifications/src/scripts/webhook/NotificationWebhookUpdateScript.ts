import {
  isSupportedWebhookApiVersion,
} from "../../infrastructure/webhooks/WebhookCapabilities.js";
import { Transactional } from "../../kernel/BaseScript.js";
import { BaseAdminMutationScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationWebhookUpdateParams,
  NotificationWebhookView,
} from "./dto/index.js";

export class NotificationWebhookUpdateScript extends BaseAdminMutationScript<
  NotificationWebhookUpdateParams,
  NotificationWebhookView
> {
  @Transactional()
  protected async execute(
    params: NotificationWebhookUpdateParams
  ) {
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
    return this.success(webhook);
  }
}
