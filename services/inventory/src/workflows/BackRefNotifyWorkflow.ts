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
    await this.syncFiles(input);
  }

  @DBOS.step()
  async syncFiles(input: BackRefNotifyInput): Promise<void> {
    const { entityRef, fileIds } = input;
    const uniqueFileIds = Array.from(new Set(fileIds));

    const result = await this.broker.call("media.syncEntityFiles", {
      entityRef,
      fileIds: uniqueFileIds,
    });

    this.logger.info(
      {
        entityRef,
        unlinkedCount: result?.unlinkedCount,
        linkedCount: result?.linkedCount,
        skippedCount: result?.skippedCount,
      },
      "BackRef sync completed"
    );
  }
}
