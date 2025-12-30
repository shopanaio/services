import { ApolloQuery } from "@shopana/type-resolver";
import { InventoryType } from "./InventoryType.js";
import { ProductQueryResolver } from "./ProductQueryResolver.js";
import { WarehouseQueryResolver } from "./WarehouseQueryResolver.js";
import { VariantQueryResolver } from "./VariantQueryResolver.js";

/**
 * Root Query resolver.
 * Decorated with @ApolloQuery to create Apollo-compatible resolver proxy.
 */
@ApolloQuery
export class QueryResolver extends InventoryType<Record<string, never>> {
  /**
   * Entry point for inventory-related queries.
   * Returns namespace resolver that handles all inventory queries.
   */
  inventoryQuery() {
    return new InventoryQueryResolver({}, this.ctx);
  }
}

/**
 * InventoryQuery namespace resolver.
 * Handles all inventory-related queries.
 */
export class InventoryQueryResolver extends InventoryType<Record<string, never>> {
  /**
   * Entry point for product-related queries.
   */
  productQuery() {
    return new ProductQueryResolver({}, this.ctx);
  }

  /**
   * Entry point for warehouse-related queries.
   */
  warehouseQuery() {
    return new WarehouseQueryResolver({}, this.ctx);
  }

  /**
   * Entry point for variant-related queries.
   */
  variantQuery() {
    return new VariantQueryResolver({}, this.ctx);
  }
}
