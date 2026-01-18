import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  FileLinkManyParams,
  FileLinkManyResult,
} from "./dto/index.js";

export class FileLinkManyScript extends BaseScript<
  FileLinkManyParams,
  FileLinkManyResult
> {
  protected async execute(
    params: FileLinkManyParams
  ): Promise<FileLinkManyResult> {
    const { items, entityRef } = params;

    if (items.length === 0) {
      return { linkedCount: 0, skippedCount: 0 };
    }

    const uniqueFileIds = Array.from(
      new Set(items.map((item) => item.fileId))
    );
    const activeFiles = await this.repository.file.findByIds(uniqueFileIds);
    const activeIds = new Set(activeFiles.map((file) => file.id));

    const activeItems = items.filter((item) => activeIds.has(item.fileId));
    const linkedCount = activeItems.length;
    const skippedCount = items.length - linkedCount;

    if (linkedCount > 0) {
      await this.repository.fileBackRef.linkMany({
        items: activeItems,
        service: entityRef.service,
        entityType: entityRef.entityType,
        entityId: entityRef.entityId,
      });
    }

    if (skippedCount > 0) {
      this.logger.info(
        { skippedCount, totalCount: items.length },
        "fileLinkMany: some files missing or soft-deleted"
      );
    }

    return { linkedCount, skippedCount };
  }

  protected handleError(_error: unknown): FileLinkManyResult {
    return { linkedCount: 0, skippedCount: 0 };
  }
}
