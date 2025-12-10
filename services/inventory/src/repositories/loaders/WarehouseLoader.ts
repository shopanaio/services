import DataLoader from "dataloader";
import type { Warehouse } from "../models/index.js";
import type { Repository } from "../Repository.js";

export interface WarehouseLoaders {
  warehouse: DataLoader<string, Warehouse | null>;
}

export class WarehouseLoader {
  constructor(private readonly repository: Repository) {}

  createLoaders(): WarehouseLoaders {
    return {
      warehouse: this.createWarehouseLoader(),
    };
  }

  private createWarehouseLoader(): DataLoader<string, Warehouse | null> {
    return new DataLoader<string, Warehouse | null>(async (warehouseIds) => {
      const results = await this.repository.warehouseLoaderQuery.getByIds(warehouseIds);
      return warehouseIds.map(
        (id) => results.find((w) => w.id === id) ?? null
      );
    });
  }
}
