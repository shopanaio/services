import { DBOS } from "@shopana/shared-kernel";
import { BaseWorkflow } from "./BaseWorkflow.js";

export interface EntityDeletedNotifyInput {
  entityRef: {
    service: string;
    entityType: string;
    entityId: string;
  };
}

export class EntityDeletedNotifyWorkflow extends BaseWorkflow {
  @DBOS.workflow()
  async run(input: EntityDeletedNotifyInput): Promise<void> {
    await this.notifyMedia(input.entityRef);
  }

  @DBOS.step()
  async notifyMedia(
    entityRef: EntityDeletedNotifyInput["entityRef"]
  ): Promise<void> {
    const result = await this.broker.call("media.entityDeleted", { entityRef });
    this.logger.info(
      { unlinkedCount: result?.unlinkedCount },
      "Entity deleted notification sent"
    );
  }
}
