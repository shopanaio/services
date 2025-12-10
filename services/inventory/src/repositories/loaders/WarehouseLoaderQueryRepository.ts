import { and, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import { warehouses, type Warehouse } from "../models/index.js";

export class WarehouseLoaderQueryRepository extends BaseRepository {
  async getByIds(warehouseIds: readonly string[]): Promise<Warehouse[]> {
    return this.connection
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.projectId, this.projectId),
          inArray(warehouses.id, [...warehouseIds])
        )
      );
  }
}
