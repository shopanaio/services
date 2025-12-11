import type { WarehouseStock } from "../../repositories/models/index.js";
import { InventoryType } from "./InventoryType.js";
import { WarehouseResolver } from "./WarehouseResolver.js";
import { VariantResolver } from "./VariantResolver.js";

/**
 * Stock view - resolves WarehouseStock domain interface
 * Accepts stock ID, loads data lazily via repository
 */
export class StockResolver extends InventoryType<string, WarehouseStock | null> {
  static fields = {
    warehouse: () => WarehouseResolver,
    variant: () => VariantResolver,
  };

  async loadData() {
    return await this.ctx.kernel
      .getServices()
      .repository.stock.findById(this.value);
  }

  id() {
    return this.value;
  }

  async warehouseId() {
    return this.get("warehouseId");
  }

  async variantId() {
    return this.get("variantId");
  }

  async warehouse() {
    return this.get("warehouseId");
  }

  async variant() {
    return this.get("variantId");
  }

  async quantityOnHand() {
    return (await this.get("quantityOnHand")) ?? 0;
  }

  async createdAt() {
    return this.get("createdAt");
  }

  async updatedAt() {
    return this.get("updatedAt");
  }
}
