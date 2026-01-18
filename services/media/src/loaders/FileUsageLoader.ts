import DataLoader from "dataloader";
import type { Repository } from "../repositories/index.js";

export interface FileUsageSummary {
  totalCount: number;
  byEntity: Array<{ entityType: string; count: number }>;
}

/**
 * FileUsageLoader - batch loads usage counts by file ID
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
