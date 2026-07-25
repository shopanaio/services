import { KernelError } from "@shopana/shared-kernel";
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import {
  adminUserErrors,
  recordAdminAudit,
  type AdminUserError,
} from "../shared/adminScriptSupport.js";

export interface NotificationWebhookDeleteResult {
  deletedWebhookId?: string;
  userErrors: AdminUserError[];
}

export class NotificationWebhookDeleteScript extends BaseScript<
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
    await recordAdminAudit(
      this.repository,
      this.context.user.id,
      "webhook.deleted",
      "webhook",
      params.id
    );
    return { deletedWebhookId: params.id, userErrors: [] };
  }

  protected handleError(error: unknown): NotificationWebhookDeleteResult {
    return {
      deletedWebhookId: undefined,
      userErrors: adminUserErrors(error),
    };
  }
}
