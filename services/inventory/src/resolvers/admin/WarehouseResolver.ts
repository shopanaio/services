import type { Warehouse } from "../../repositories/models/index.js";
import type { StockRelayInput } from "../../repositories/stock/StockRepository.js";
import { InventoryType } from "./InventoryType.js";
import { StockConnectionResolver } from "./StockConnectionResolver.js";

/**
 * Warehouse view - resolves Warehouse domain interface
 * Accepts warehouse ID, loads data lazily via loaders
 */
export class WarehouseResolver extends InventoryType<string, Warehouse | null> {
  static fields = {
    stock: () => StockConnectionResolver,
  };

  async loadData() {
    return await this.ctx.loaders.warehouse.load(this.value);
  }

  id() {
    return this.value;
  }

  async code() {
    return this.get("code");
  }

  async name() {
    return this.get("name");
  }

  async isDefault() {
    return (await this.get("isDefault")) ?? false;
  }

  async createdAt() {
    return this.get("createdAt");
  }

  async updatedAt() {
    return this.get("updatedAt");
  }

  async variantsCount(): Promise<number> {
    // TODO: implement via loader when needed
    return 0;
  }

  async stock(args: Omit<StockRelayInput, "where">): Promise<StockRelayInput> {
    return {
      ...args,
      where: {
        warehouseId: { _eq: this.value },
      },
    };
  }
}
