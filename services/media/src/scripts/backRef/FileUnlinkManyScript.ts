import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  FileUnlinkManyParams,
  FileUnlinkManyResult,
} from "./dto/index.js";

export class FileUnlinkManyScript extends BaseScript<
  FileUnlinkManyParams,
  FileUnlinkManyResult
> {
  protected async execute(
    params: FileUnlinkManyParams
  ): Promise<FileUnlinkManyResult> {
    const { items, entityRef } = params;

    if (items.length === 0) {
      return { unlinkedCount: 0, skippedCount: 0 };
    }

    // Deduplicate items by fileId+role first
    const uniqueItems = Array.from(
      new Map(items.map((item) => [`${item.fileId}:${item.role}`, item])).values()
    );

    const unlinkedCount = await this.repository.fileBackRef.unlinkMany({
      items: uniqueItems,
      service: entityRef.service,
      entityType: entityRef.entityType,
      entityId: entityRef.entityId,
    });

    // skippedCount = items that didn't exist (already unlinked or never linked)
    const skippedCount = uniqueItems.length - unlinkedCount;

    if (skippedCount > 0) {
      this.logger.info(
        { skippedCount, totalCount: uniqueItems.length, unlinkedCount },
        "fileUnlinkMany: some refs were already unlinked or never existed"
      );
    }

    return { unlinkedCount, skippedCount };
  }

  protected handleError(_error: unknown): FileUnlinkManyResult {
    return { unlinkedCount: 0, skippedCount: 0 };
  }
}
