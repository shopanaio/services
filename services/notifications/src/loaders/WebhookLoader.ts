import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";

export class WebhookLoader {
  public readonly webhook;

  constructor(repository: Repository) {
    this.webhook = new DataLoader(async (ids: readonly string[]) => {
      const webhooks = await repository.webhooks.getByIds(ids);
      const webhooksById = new Map(
        webhooks.map((webhook) => [webhook.id, webhook])
      );
      return ids.map((id) => webhooksById.get(id) ?? null);
    });
  }
}
