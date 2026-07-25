import {
  isSupportedWebhookApiVersion,
} from "../../infrastructure/webhooks/WebhookCapabilities.js";
import { Transactional } from "../../kernel/BaseScript.js";
import { BaseAdminMutationScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationWebhookCreateParams,
  NotificationWebhookView,
} from "./dto/index.js";

export class NotificationWebhookCreateScript extends BaseAdminMutationScript<
  NotificationWebhookCreateParams,
  NotificationWebhookView
> {
  @Transactional()
  protected async execute(
    params: NotificationWebhookCreateParams
  ) {
    if (this.definitions.forEvent(params.eventType).length === 0) {
      throw new Error("UNSUPPORTED_WEBHOOK_EVENT");
    }
    if (!isSupportedWebhookApiVersion(params.apiVersion)) {
      throw new Error("UNSUPPORTED_WEBHOOK_API_VERSION");
    }
    const webhook = await this.repository.webhooks.create({
      ...params,
      createdBy: this.context.user.id,
    });
    await this.audit("webhook.created", "webhook", webhook.id, {
      eventType: params.eventType,
      format: params.format,
    });
    return this.success(webhook);
  }
}
