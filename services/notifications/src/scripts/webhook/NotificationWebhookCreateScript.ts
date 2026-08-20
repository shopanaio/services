import { isSupportedWebhookApiVersion } from "../../infrastructure/webhooks/WebhookCapabilities.js";
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import {
  adminUserErrors,
  recordAdminAudit,
  type AdminUserError,
} from "../shared/adminScriptSupport.js";
import type { NotificationWebhookCreateParams, NotificationWebhookView } from "./dto/index.js";

export interface NotificationWebhookCreateResult {
  webhook?: NotificationWebhookView;
  userErrors: AdminUserError[];
}

export class NotificationWebhookCreateScript extends BaseScript<
  NotificationWebhookCreateParams,
  NotificationWebhookCreateResult
> {
  @Transactional()
  protected async execute(params: NotificationWebhookCreateParams) {
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
    await recordAdminAudit(
      this.repository,
      this.context.user.id,
      "webhook.created",
      "webhook",
      webhook.id,
      { eventType: params.eventType, format: params.format },
    );
    return { webhook, userErrors: [] };
  }

  protected handleError(error: unknown): NotificationWebhookCreateResult {
    return { webhook: undefined, userErrors: adminUserErrors(error) };
  }
}
