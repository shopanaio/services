import DataLoader from "dataloader";
import type { User } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class UserLoader {
  public readonly user: DataLoader<string, User | null>;

  constructor(repository: Repository) {
    this.user = new DataLoader<string, User | null>(async (userIds) => {
      const results = await repository.user.getByIds(userIds);
      return userIds.map((id) => results.find((u) => u.id === id) ?? null);
    });
  }
}
