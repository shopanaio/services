import { KernelError } from "@shopana/shared-kernel";
import { Transactional } from "../../kernel/BaseScript.js";
import { BaseAdminMutationScript } from "../shared/BaseAdminScript.js";
import type { NotificationWebhookDeleteResult } from "./dto/index.js";

export class NotificationWebhookDeleteScript extends BaseAdminMutationScript<
  { id: string },
  NotificationWebhookDeleteResult
> {
  @Transactional()
  protected async execute(params: { id: string }) {
    const deleted = await this.repository.webhooks.delete(params.id);
    if (!deleted) {
      throw new KernelError(
        "Webhook subscription was not found",
        "WEBHOOK_NOT_FOUND"
      );
    }
    await this.audit("webhook.deleted", "webhook", params.id);
    return this.success({ deleted: true });
  }
}
