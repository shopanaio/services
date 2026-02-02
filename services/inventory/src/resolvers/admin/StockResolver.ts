import { encodeGlobalId, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { WarehouseStock } from "../../repositories/models/index.js";
import { InventoryType } from "./InventoryType.js";
import { WarehouseResolver } from "./WarehouseResolver.js";

/**
 * Stock view - resolves WarehouseStock domain interface
 * Accepts stock ID, loads data lazily via repository
 */
export class StockResolver extends InventoryType<string, WarehouseStock | null> {
  async $preload() {
    return await this.$ctx.kernel
      .getServices()
      .repository.stock.findById(this.$props);
  }

  id() {
    return this.$props;
  }

  async warehouseId() {
    return this.$get("warehouseId");
  }

  async variantId() {
    return this.$get("variantId");
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
      id: encodeGlobalId(GlobalIdEntity.Variant, variantId),
    };
  }

  async quantityOnHand() {
    return (await this.$get("quantityOnHand")) ?? 0;
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}
