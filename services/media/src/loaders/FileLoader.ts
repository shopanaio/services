import DataLoader from "dataloader";
import type { Repository } from "../repositories/index.js";
import type { File } from "../repositories/models/index.js";
import { getContext } from "../context/index.js";

/**
 * FileLoader - batch loads file data by ID
 */
export class FileLoader {
  public readonly file: DataLoader<string, File | null>;

  constructor(repository: Repository) {
    this.file = new DataLoader<string, File | null>(async (ids) => {
      const projectId = getContext().store.id;
      const files = await repository.file.findByIds(projectId, ids as string[]);
      const fileMap = new Map(files.map((f) => [f.id, f]));
      return ids.map((id) => fileMap.get(id) ?? null);
    });
  }
}
