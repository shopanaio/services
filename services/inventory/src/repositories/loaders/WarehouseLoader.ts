import DataLoader from "dataloader";
import type { Warehouse } from "../models/index.js";
import type { WarehouseLoaderQueryRepository } from "./WarehouseLoaderQueryRepository.js";

export interface WarehouseLoaders {
  warehouse: DataLoader<string, Warehouse | null>;
}

export class WarehouseLoader {
  constructor(private readonly queryRepo: WarehouseLoaderQueryRepository) {}

  createLoaders(): WarehouseLoaders {
    return {
      warehouse: this.createWarehouseLoader(),
    };
  }

  private createWarehouseLoader(): DataLoader<string, Warehouse | null> {
    return new DataLoader<string, Warehouse | null>(async (warehouseIds) => {
      const results = await this.queryRepo.getByIds(warehouseIds);
      return warehouseIds.map(
        (id) => results.find((w) => w.id === id) ?? null
      );
    });
  }
}
