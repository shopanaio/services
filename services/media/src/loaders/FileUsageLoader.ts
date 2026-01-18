import DataLoader from "dataloader";
import type { Repository } from "../repositories/index.js";

/**
 * Raw usage summary without file status.
 * The FileResolver adds `fileActive` based on file.deletedAt.
 */
export interface FileUsageSummary {
  totalCount: number;
  byEntity: Array<{ entityType: string; count: number }>;
}

/**
 * FileUsageLoader - batch loads usage counts by file ID.
 *
 * **Important:** This loader returns raw usage counts without `fileActive` flag.
 * The `FileResolver.usage()` method:
 * - Checks `file.deletedAt` to determine if file is active
 * - For soft-deleted files, returns `{ totalCount: 0, byEntity: [], fileActive: false }`
 * - For active files, returns loader data with `fileActive: true`
 *
 * This separation allows the loader to be context-agnostic while the resolver
 * handles file state logic.
 */
export class FileUsageLoader {
  public readonly usage: DataLoader<string, FileUsageSummary>;

  constructor(repository: Repository) {
    this.usage = new DataLoader<string, FileUsageSummary>(async (fileIds) => {
      const usageMap = await repository.fileBackRef.getUsageByFileIds(
        fileIds as string[]
      );

      return fileIds.map((fileId) => {
        const byEntity = usageMap.get(fileId) ?? [];
        const totalCount = byEntity.reduce((sum, row) => sum + row.count, 0);
        return { totalCount, byEntity };
      });
    });
  }
}
