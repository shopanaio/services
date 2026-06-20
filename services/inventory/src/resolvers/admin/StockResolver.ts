import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { WarehouseStock } from "../../repositories/models/index.js";
import { InventoryType } from "./InventoryType.js";
import { WarehouseResolver } from "./WarehouseResolver.js";

/**
 * Stock view - resolves WarehouseStock domain interface
 * Accepts stock ID, loads data lazily via repository
 */
export class StockResolver extends InventoryType<string, WarehouseStock> {
  async $preload(): Promise<WarehouseStock> {
    const data = await this.$ctx.kernel
      .getServices()
      .repository.stock.findById(this.$props);
    if (!data) {
      throw new Error(`Stock not found: ${this.$props}`);
    }
    return data;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.WarehouseStock);
  }

  async warehouseId() {
    const warehouseId = await this.$get("warehouseId");
    return encodeGlobalIdByType(warehouseId, GlobalIdEntity.Warehouse);
  }

  async variantId() {
    const variantId = await this.$get("variantId");
    return encodeGlobalIdByType(variantId, GlobalIdEntity.Variant);
  }

  async warehouse() {
    const warehouseId = await this.$get("warehouseId");
    return warehouseId ? new WarehouseResolver(warehouseId, this.$ctx) : null;
  }

  /**
   * Returns a federation reference to the Variant.
   * Apollo Gateway will resolve the full Variant from Catalog service.
   */
  async variant() {
    const variantId = await this.$get("variantId");
    if (!variantId) return null;

    // Return a reference object for Apollo Federation
    // Gateway will route to Catalog service to resolve the full Variant
    return {
      __typename: "Variant" as const,
      id: encodeGlobalIdByType(variantId, GlobalIdEntity.Variant),
    };
  }

  async quantityOnHand() {
    return (await this.$get("quantityOnHand")) ?? 0;
  }

  async reservedQuantity() {
    return (await this.$get("reservedQty")) ?? 0;
  }

  async unavailableQuantity() {
    return (await this.$get("unavailableQty")) ?? 0;
  }

  async availableForSale() {
    const quantityOnHand = (await this.$get("quantityOnHand")) ?? 0;
    const reservedQuantity = (await this.$get("reservedQty")) ?? 0;
    const unavailableQuantity = (await this.$get("unavailableQty")) ?? 0;

    return quantityOnHand - reservedQuantity - unavailableQuantity;
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}
