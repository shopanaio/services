import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  SyncEntityFilesParams,
  SyncEntityFilesResult,
} from "./dto/index.js";

const DEFAULT_ROLE = "gallery";

/**
 * Sync entity files - clears all existing back-refs and re-links the provided files.
 * This is an atomic "reset + relink" operation.
 */
export class SyncEntityFilesScript extends BaseScript<
  SyncEntityFilesParams,
  SyncEntityFilesResult
> {
  @Transactional()
  protected async execute(
    params: SyncEntityFilesParams
  ): Promise<SyncEntityFilesResult> {
    const { entityRef, fileIds, role = DEFAULT_ROLE } = params;

    // 1. Clear all existing back-refs for this entity
    const unlinkedCount = await this.repository.fileBackRef.unlinkAllByEntity({
      service: entityRef.service,
      entityType: entityRef.entityType,
      entityId: entityRef.entityId,
    });

    // 2. If no files to link, we're done
    if (fileIds.length === 0) {
      this.logger.info(
        { entityRef, unlinkedCount },
        "syncEntityFiles: cleared refs, no files to link"
      );
      return { unlinkedCount, linkedCount: 0, skippedCount: 0 };
    }

    // 3. Deduplicate and link new files
    const uniqueFileIds = Array.from(new Set(fileIds));
    const items = uniqueFileIds.map((fileId) => ({ fileId, role }));

    const { linkedCount } = await this.repository.fileBackRef.linkMany({
      items,
      service: entityRef.service,
      entityType: entityRef.entityType,
      entityId: entityRef.entityId,
    });

    const skippedCount = uniqueFileIds.length - linkedCount;

    this.logger.info(
      { entityRef, unlinkedCount, linkedCount, skippedCount },
      "syncEntityFiles: completed"
    );

    return { unlinkedCount, linkedCount, skippedCount };
  }

  protected handleError(_error: unknown): SyncEntityFilesResult {
    return { unlinkedCount: 0, linkedCount: 0, skippedCount: 0 };
  }
}
