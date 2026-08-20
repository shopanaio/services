import DataLoader from "dataloader";
import type { ProductOptionCategory } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class OptionCategoryLoader {
  public readonly optionCategory: DataLoader<string, ProductOptionCategory | null>;

  constructor(repository: Repository) {
    this.optionCategory = new DataLoader(async (ids) => {
      const rows = await repository.optionCategory.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });
  }
}
