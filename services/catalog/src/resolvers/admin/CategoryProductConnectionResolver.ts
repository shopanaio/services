import type { CategoryProductsRelayInput } from "../../repositories/category/CategoryRepository.js";
import { ProductResolver } from "./ProductResolver.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export interface ProductOrderByInput {
  field: "MANUAL" | "PRICE" | "NEWEST" | "NAME";
  direction?: "asc" | "desc";
}

export interface CategoryProductConnectionInput {
  categoryId: string;
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  orderBy?: ProductOrderByInput[];
}

/**
 * CategoryProductConnection - resolves paginated product list for a category
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class CategoryProductConnectionResolver extends BaseConnectionResolver<CategoryProductConnectionInput> {
  async $preload(): Promise<ConnectionData> {
    const { categoryId, ...args } = this.$props;
    return this.$ctx.kernel
      .getServices()
      .repository.category.getCategoryProductsConnection(categoryId, args);
  }

  protected createNodeResolver(nodeId: string) {
    return new ProductResolver(nodeId, this.$ctx);
  }
}
