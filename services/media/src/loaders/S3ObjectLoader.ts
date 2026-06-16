import DataLoader from "dataloader";
import type { Repository } from "../repositories/index.js";
import type { S3Object } from "../repositories/models/index.js";

/**
 * S3ObjectLoader - batch loads S3 object data by file ID
 */
export class S3ObjectLoader {
  public readonly s3Object: DataLoader<string, S3Object | null>;

  constructor(repository: Repository) {
    this.s3Object = new DataLoader<string, S3Object | null>(async (fileIds) => {
      const map = await repository.s3Object.findByFileIds(fileIds as string[]);
      return fileIds.map((id) => map.get(id) ?? null);
    });
  }
}
