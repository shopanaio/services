import DataLoader from "dataloader";
import type { WarehouseStock } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class StockLoader {
  public readonly stockByVariant: DataLoader<string, WarehouseStock[]>;

  constructor(repository: Repository) {
    this.stockByVariant = new DataLoader<string, WarehouseStock[]>(
      async (variantIds) => {
        const stocksByVariant = await repository.stock.getByVariantsBatch([
          ...variantIds,
        ]);
        return variantIds.map((id) => stocksByVariant.get(id) ?? []);
      }
    );
  }
}
