import DataLoader from "dataloader";
import type { Warehouse } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class WarehouseLoader {
  public readonly warehouse: DataLoader<string, Warehouse | null>;

  constructor(repository: Repository) {
    this.warehouse = new DataLoader<string, Warehouse | null>(async (warehouseIds) => {
      const results = await repository.warehouseLoaderQuery.getByIds(warehouseIds);
      return warehouseIds.map((id) => results.find((w) => w.id === id) ?? null);
    });
  }
}
