import DataLoader from "dataloader";
import type { Repository } from "../repositories/index.js";
import type { ExternalMedia } from "../repositories/models/index.js";
import { getContext } from "../context/index.js";

/**
 * ExternalMediaLoader - batch loads external media data by file ID
 */
export class ExternalMediaLoader {
  public readonly externalMedia: DataLoader<string, ExternalMedia | null>;

  constructor(repository: Repository) {
    this.externalMedia = new DataLoader<string, ExternalMedia | null>(
      async (fileIds) => {
        const projectId = getContext().store.id;
        const map = await repository.externalMedia.findByFileIds(
          projectId,
          fileIds as string[]
        );
        return fileIds.map((id) => map.get(id) ?? null);
      }
    );
  }
}
