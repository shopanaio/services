import DataLoader from "dataloader";
import { and, eq, inArray } from "drizzle-orm";
import { BaseLoader } from "./BaseLoader.js";
import { warehouses, type Warehouse } from "../models/index.js";

/**
 * Warehouse loaders interface
 */
export interface WarehouseLoaders {
  warehouse: DataLoader<string, Warehouse | null>;
}

/**
 * Loader for warehouse-related data with batch loading support.
 */
export class WarehouseLoader extends BaseLoader {
  /**
   * Create all warehouse-related DataLoaders
   */
  createLoaders(): WarehouseLoaders {
    return {
      warehouse: this.createWarehouseLoader(),
    };
  }

  /**
   * Warehouse by ID
   */
  private createWarehouseLoader(): DataLoader<string, Warehouse | null> {
    return new DataLoader<string, Warehouse | null>(async (warehouseIds) => {
      const conn = this.connection;
      const projectId = this.projectId;

      const results = await conn
        .select()
        .from(warehouses)
        .where(
          and(
            eq(warehouses.projectId, projectId),
            inArray(warehouses.id, [...warehouseIds])
          )
        );

      return warehouseIds.map(
        (id) => results.find((w) => w.id === id) ?? null
      );
    });
  }
}
