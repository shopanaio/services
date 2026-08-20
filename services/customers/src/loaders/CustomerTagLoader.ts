import DataLoader from "dataloader";
import type { CustomerTag, CustomerTagAssignment } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";
import { mapById } from "./batch.js";

export class CustomerTagLoader {
  readonly tag: DataLoader<string, CustomerTag | null>;
  readonly tagAssignment: DataLoader<string, CustomerTagAssignment | null>;
  readonly tagCustomersCount: DataLoader<string, number>;

  constructor(repository: Repository) {
    this.tag = new DataLoader(async (ids) => mapById(ids, await repository.tag.getByIds(ids)));
    this.tagAssignment = new DataLoader(async (ids) =>
      mapById(ids, await repository.tag.getAssignmentsByIds(ids)),
    );
    this.tagCustomersCount = new DataLoader(async (tagIds) => {
      const counts = await repository.tag.countCustomersByTagIds(tagIds);
      return tagIds.map((tagId) => counts.get(tagId) ?? 0);
    });
  }
}
