import DataLoader from "dataloader";
import type {
  BulkEditJob,
  BulkEditItem,
} from "../repositories/models/index.js";
import {
  emptyProgressCounts,
  type BulkEditJobProgressCounts,
} from "../repositories/BulkEditItemRepository.js";
import type { Repository } from "../repositories/Repository.js";

export class BulkEditLoader {
  public readonly bulkEditJob: DataLoader<string, BulkEditJob | null>;
  public readonly bulkEditItem: DataLoader<string, BulkEditItem | null>;
  public readonly bulkEditJobProgress: DataLoader<
    string,
    BulkEditJobProgressCounts
  >;
  public readonly bulkEditJobTotalProducts: DataLoader<string, number>;

  constructor(repository: Repository) {
    this.bulkEditJob = new DataLoader<string, BulkEditJob | null>(
      async (jobIds) => {
        const rows = await repository.bulkEditJob.getByIds(jobIds);
        return jobIds.map((id) => rows.find((job) => job.id === id) ?? null);
      },
    );

    this.bulkEditItem = new DataLoader<string, BulkEditItem | null>(
      async (itemIds) => {
        const rows = await repository.bulkEditItem.getByIds(itemIds);
        return itemIds.map((id) => rows.find((item) => item.id === id) ?? null);
      },
    );

    this.bulkEditJobProgress = new DataLoader<
      string,
      BulkEditJobProgressCounts
    >(async (jobIds) => {
      const counts = await repository.bulkEditItem.countByStatusForJobs(jobIds);
      return jobIds.map((jobId) => counts.get(jobId) ?? emptyProgressCounts());
    });

    this.bulkEditJobTotalProducts = new DataLoader<string, number>(
      async (jobIds) => {
        const counts =
          await repository.bulkEditItem.countDistinctProductsForJobs(jobIds);
        return jobIds.map((jobId) => counts.get(jobId) ?? 0);
      },
    );
  }
}
