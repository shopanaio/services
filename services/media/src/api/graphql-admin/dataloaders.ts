import DataLoader from "dataloader";
import type { Repository } from "../../repositories/index.js";
import type { File } from "../../repositories/models/index.js";
import type { S3Object } from "../../repositories/models/index.js";
import type { ExternalMedia } from "../../repositories/models/index.js";

export interface DataLoaders {
  fileLoader: DataLoader<string, File | null>;
  s3ObjectLoader: DataLoader<string, S3Object | null>;
  externalMediaLoader: DataLoader<string, ExternalMedia | null>;
}

/**
 * Creates DataLoaders for a specific project context.
 * DataLoaders batch and cache database calls to prevent N+1 queries.
 */
export function createDataLoaders(
  projectId: string,
  repository: Repository
): DataLoaders {
  const fileLoader = new DataLoader<string, File | null>(async (ids) => {
    const files = await repository.file.findByIds(projectId, ids as string[]);
    const fileMap = new Map(files.map((f) => [f.id, f]));
    return ids.map((id) => fileMap.get(id) ?? null);
  });

  const s3ObjectLoader = new DataLoader<string, S3Object | null>(
    async (fileIds) => {
      const map = await repository.s3Object.findByFileIds(
        projectId,
        fileIds as string[]
      );
      return fileIds.map((id) => map.get(id) ?? null);
    }
  );

  const externalMediaLoader = new DataLoader<string, ExternalMedia | null>(
    async (fileIds) => {
      const map = await repository.externalMedia.findByFileIds(
        projectId,
        fileIds as string[]
      );
      return fileIds.map((id) => map.get(id) ?? null);
    }
  );

  return {
    fileLoader,
    s3ObjectLoader,
    externalMediaLoader,
  };
}
