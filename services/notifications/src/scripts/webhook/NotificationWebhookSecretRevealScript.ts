import { Transactional } from "../../kernel/BaseScript.js";
import { BaseAdminMutationScript } from "../shared/BaseAdminScript.js";
import type { NotificationWebhookSecretResult } from "./dto/index.js";

export class NotificationWebhookSecretRevealScript extends BaseAdminMutationScript<
  Record<string, never>,
  NotificationWebhookSecretResult
> {
  @Transactional()
  protected async execute() {
    const secret = await this.repository.webhooks.revealSecret();
    await this.audit(
      "webhook.secret.revealed",
      "webhookSecret",
      this.context.store.id
    );
    return this.success({ secret });
  }
}
