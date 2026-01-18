import { DBOS } from "@shopana/workflows";
import { BaseWorkflow } from "./BaseWorkflow.js";

export interface BackRefNotifyInput {
  entityRef: {
    service: string;
    entityType: string;
    entityId: string;
  };
  fileIds: string[];
}

export class BackRefNotifyWorkflow extends BaseWorkflow {
  @DBOS.workflow()
  async run(input: BackRefNotifyInput): Promise<void> {
    const { entityRef } = input;
    const uniqueFileIds = Array.from(new Set(input.fileIds));

    await this.clearBackRefs(entityRef);

    if (uniqueFileIds.length > 0) {
      await this.linkFiles(uniqueFileIds, entityRef);
    }
  }

  @DBOS.step()
  async clearBackRefs(entityRef: BackRefNotifyInput["entityRef"]): Promise<void> {
    const result = await this.broker.call("media.entityDeleted", { entityRef });
    this.logger.info(
      { unlinkedCount: result?.unlinkedCount },
      "BackRef reset completed"
    );
  }

  @DBOS.step()
  async linkFiles(
    fileIds: string[],
    entityRef: BackRefNotifyInput["entityRef"]
  ): Promise<void> {
    const items = fileIds.map((fileId) => ({ fileId, role: "gallery" }));
    const result = await this.broker.call("media.fileLinkMany", {
      items,
      entityRef,
    });
    this.logger.info(
      {
        linkedCount: result?.linkedCount,
        skippedCount: result?.skippedCount,
      },
      "BackRef link completed"
    );
  }
}
