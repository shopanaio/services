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

    // Deduplicate items by fileId+role for accurate counting
    const uniqueItems = Array.from(
      new Map(items.map((item) => [`${item.fileId}:${item.role}`, item])).values()
    );

    // linkMany handles soft-delete check in SQL and returns accurate count
    const { linkedCount } = await this.repository.fileBackRef.linkMany({
      items: uniqueItems,
      service: entityRef.service,
      entityType: entityRef.entityType,
      entityId: entityRef.entityId,
    });

    const skippedCount = uniqueItems.length - linkedCount;

    if (skippedCount > 0) {
      this.logger.info(
        { skippedCount, totalCount: uniqueItems.length, linkedCount },
        "fileLinkMany: some files missing or soft-deleted"
      );
    }

    return { linkedCount, skippedCount };
  }

  protected handleError(_error: unknown): FileLinkManyResult {
    return { linkedCount: 0, skippedCount: 0 };
  }
}
