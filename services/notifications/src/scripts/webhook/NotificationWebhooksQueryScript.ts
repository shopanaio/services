import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type { NotificationWebhookListView } from "./dto/index.js";

export class NotificationWebhooksQueryScript extends BaseAdminScript<
  Record<string, never>,
  NotificationWebhookListView
> {
  protected async execute(): Promise<NotificationWebhookListView> {
    await this.authorize("notification_webhook", "read");
    return this.repository.webhooks.list();
  }
}
