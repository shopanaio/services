import { isSupportedWebhookApiVersion } from "../../infrastructure/webhooks/WebhookCapabilities.js";
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import {
  adminUserErrors,
  recordAdminAudit,
  type AdminUserError,
} from "../shared/adminScriptSupport.js";
import type { NotificationWebhookUpdateParams, NotificationWebhookView } from "./dto/index.js";

export interface NotificationWebhookUpdateResult {
  webhook?: NotificationWebhookView;
  userErrors: AdminUserError[];
}

export class NotificationWebhookUpdateScript extends BaseScript<
  NotificationWebhookUpdateParams,
  NotificationWebhookUpdateResult
> {
  @Transactional()
  protected async execute(params: NotificationWebhookUpdateParams) {
    if (params.eventType && this.definitions.forEvent(params.eventType).length === 0) {
      throw new Error("UNSUPPORTED_WEBHOOK_EVENT");
    }
    if (params.apiVersion && !isSupportedWebhookApiVersion(params.apiVersion)) {
      throw new Error("UNSUPPORTED_WEBHOOK_API_VERSION");
    }
    const webhook = await this.repository.webhooks.update(params);
    await recordAdminAudit(
      this.repository,
      this.context.user.id,
      "webhook.updated",
      "webhook",
      params.id,
      { status: webhook.status },
    );
    return { webhook, userErrors: [] };
  }

  protected handleError(error: unknown): NotificationWebhookUpdateResult {
    return { webhook: undefined, userErrors: adminUserErrors(error) };
  }
}
