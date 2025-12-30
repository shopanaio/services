import { InventoryType } from "./InventoryType.js";
import { ProductResolver } from "./ProductResolver.js";
import {
  ProductConnectionResolver,
  type ProductConnectionInput,
} from "./ProductConnectionResolver.js";

/**
 * ProductQuery namespace resolver.
 * Handles all product-related queries.
 */
export class ProductQueryResolver extends InventoryType<Record<string, never>> {
  /**
   * Get a single product by ID.
   */
  product(args: { id: string }) {
    return new ProductResolver(args.id, this.ctx);
  }

  /**
   * Get a paginated list of products.
   */
  products(args: ProductConnectionInput) {
    return new ProductConnectionResolver(args, this.ctx);
  }

  /**
   * Get a node by ID (for Relay compatibility).
   */
  node(args: { id: string }) {
    return new ProductResolver(args.id, this.ctx);
  }

  /**
   * Get multiple nodes by IDs (for Relay compatibility).
   */
  nodes(args: { ids: string[] }) {
    return args.ids.map((id) => new ProductResolver(id, this.ctx));
  }
}
