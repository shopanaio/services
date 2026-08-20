import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import {
  adminUserErrors,
  recordAdminAudit,
  type AdminUserError,
} from "../shared/adminScriptSupport.js";
export interface NotificationWebhookSecretRevealResult {
  secret?: string;
  userErrors: AdminUserError[];
}

export class NotificationWebhookSecretRevealScript extends BaseScript<
  Record<string, never>,
  NotificationWebhookSecretRevealResult
> {
  @Transactional()
  protected async execute() {
    const secret = await this.repository.webhooks.revealSecret();
    await recordAdminAudit(
      this.repository,
      this.context.user.id,
      "webhook.secret.revealed",
      "webhookSecret",
      this.context.store.id,
    );
    return { secret, userErrors: [] };
  }

  protected handleError(error: unknown): NotificationWebhookSecretRevealResult {
    return { secret: undefined, userErrors: adminUserErrors(error) };
  }
}
