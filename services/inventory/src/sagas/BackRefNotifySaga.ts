import { DBOS } from "@shopana/shared-kernel";
import type { Media, EntityRef } from "@shopana/broker-types";
import { BaseSaga } from "./BaseSaga.js";

export interface BackRefNotifyInput {
  entityRef: EntityRef;
  fileIds: string[];
}

export class BackRefNotifySaga extends BaseSaga {
  @DBOS.workflow()
  async run(input: BackRefNotifyInput): Promise<void> {
    await this.syncFiles(input);
  }

  @DBOS.step()
  async syncFiles(input: BackRefNotifyInput): Promise<void> {
    const { entityRef, fileIds } = input;
    const uniqueFileIds = Array.from(new Set(fileIds));

    const result = await this.broker.call<Media.SyncEntityFilesResult, Media.SyncEntityFilesParams>(
      "media.syncEntityFiles",
      {
        entityRef,
        fileIds: uniqueFileIds,
      },
    );

    this.logger.info(
      {
        entityRef,
        unlinkedCount: result.unlinkedCount,
        linkedCount: result.linkedCount,
        skippedCount: result.skippedCount,
      },
      "BackRef sync completed"
    );
  }
}
