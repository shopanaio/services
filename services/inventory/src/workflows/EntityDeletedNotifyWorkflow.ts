import { DBOS } from "@shopana/shared-kernel";
import type { Media, EntityRef } from "@shopana/broker-types";
import { BaseWorkflow } from "./BaseWorkflow.js";

export interface EntityDeletedNotifyInput {
  entityRef: EntityRef;
}

export class EntityDeletedNotifyWorkflow extends BaseWorkflow {
  @DBOS.workflow()
  async run(input: EntityDeletedNotifyInput): Promise<void> {
    await this.notifyMedia(input.entityRef);
  }

  @DBOS.step()
  async notifyMedia(entityRef: EntityRef): Promise<void> {
    const result = await this.broker.call<Media.EntityDeletedResult, Media.EntityDeletedParams>(
      "media.entityDeleted",
      { entityRef },
    );
    this.logger.info(
      { unlinkedCount: result.unlinkedCount },
      "Entity deleted notification sent"
    );
  }
}
