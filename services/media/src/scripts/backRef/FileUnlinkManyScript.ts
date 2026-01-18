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

    const unlinkedCount = await this.repository.fileBackRef.unlinkMany({
      items,
      service: entityRef.service,
      entityType: entityRef.entityType,
      entityId: entityRef.entityId,
    });

    const uniqueItems = new Set(items.map((item) => `${item.fileId}:${item.role}`));
    const skippedCount = uniqueItems.size - unlinkedCount;

    if (skippedCount > 0) {
      this.logger.info(
        { skippedCount, totalCount: uniqueItems.size },
        "fileUnlinkMany: some refs missing or already unlinked"
      );
    }

    return { unlinkedCount, skippedCount };
  }

  protected handleError(_error: unknown): FileUnlinkManyResult {
    return { unlinkedCount: 0, skippedCount: 0 };
  }
}
