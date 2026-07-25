import { Transactional } from "../../kernel/BaseScript.js";
import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type { NotificationWebhookDeleteResult } from "./dto/index.js";

export class NotificationWebhookDeleteScript extends BaseAdminScript<
  { id: string },
  NotificationWebhookDeleteResult
> {
  @Transactional()
  protected async execute(params: {
    id: string;
  }): Promise<NotificationWebhookDeleteResult> {
    const deleted = await this.repository.webhooks.delete(params.id);
    if (deleted) {
      await this.audit("webhook.deleted", "webhook", params.id);
    }
    return { deleted };
  }
}
