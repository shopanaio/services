import { BaseRepository } from "../BaseRepository.js";
import { notificationAuditEvents } from "../models/index.js";

export class AuditRepository extends BaseRepository {
  async record(input: {
    action: string;
    entityType: string;
    entityId: string;
    actorId?: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    await this.connection.insert(notificationAuditEvents).values({
      id: await this.generateUuidV7(),
      storeId: this.storeId,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload ?? {},
    });
  }
}
