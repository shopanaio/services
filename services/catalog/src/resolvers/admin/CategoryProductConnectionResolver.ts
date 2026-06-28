import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export interface ListingOrderByInput {
  field: "MANUAL" | "PRICE" | "NEWEST" | "NAME";
  direction?: "asc" | "desc";
}

export interface CategoryProductConnectionInput {
  categoryId: string;
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  orderBy?: ListingOrderByInput[];
  where?: Record<string, unknown>;
}

/**
 * CategoryProductConnection - resolves paginated product list for a category
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class CategoryProductConnectionResolver extends BaseConnectionResolver<CategoryProductConnectionInput> {
  async $preload(): Promise<ConnectionData> {
    const { categoryId, ...args } = this.$props;

    const res = await this.$ctx.kernel
      .getServices()
      .repository.category.getCategoryProductsConnection(categoryId, args);

    return res;
  }

  protected async createNodeResolver(nodeId: string) {
    return this.resolvers.product(nodeId);
  }
}
