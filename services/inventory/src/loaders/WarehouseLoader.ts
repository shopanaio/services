import DataLoader from "dataloader";
import type { Warehouse } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class WarehouseLoader {
  public readonly warehouse: DataLoader<string, Warehouse | null>;

  constructor(repository: Repository) {
    this.warehouse = new DataLoader<string, Warehouse | null>(async (warehouseIds) => {
      console.log("[WarehouseLoader] Loading warehouse ids:", warehouseIds);
      const results = await repository.warehouse.getByIds(warehouseIds);
      console.log("[WarehouseLoader] Loaded results:", JSON.stringify(results));
      const mapped = warehouseIds.map((id) => results.find((w) => w.id === id) ?? null);
      console.log("[WarehouseLoader] Mapped results:", JSON.stringify(mapped));
      return mapped;
    });
  }
}
