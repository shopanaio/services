import { Transactional } from "../../kernel/BaseScript.js";
import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type { NotificationWebhookSecretResult } from "./dto/index.js";

export class NotificationWebhookSecretRevealScript extends BaseAdminScript<
  Record<string, never>,
  NotificationWebhookSecretResult
> {
  @Transactional()
  protected async execute(): Promise<NotificationWebhookSecretResult> {
    await this.authorize("notification_webhook", "reveal_secret");
    const secret = await this.repository.webhooks.revealSecret();
    await this.audit(
      "webhook.secret.revealed",
      "webhookSecret",
      this.context.store.id
    );
    return { secret };
  }
}
