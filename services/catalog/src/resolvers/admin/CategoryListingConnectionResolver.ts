import type {
  CategoryListingConnectionResult,
  CategoryListingRelayInput,
} from "../../repositories/category/CategoryRepository.js";
import { CatalogType } from "./CatalogType.js";

export interface CategoryListingConnectionInput {
  categoryId: string;
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  orderBy?: Array<{ field: string; direction?: string }>;
  where?: CategoryListingRelayInput["where"];
}

type CategoryListingEdge = CategoryListingConnectionResult["edges"][number];

/**
 * CategoryListingConnection resolves mixed Product/Bundle category listings.
 */
export class CategoryListingConnectionResolver extends CatalogType<
  CategoryListingConnectionInput,
  CategoryListingConnectionResult
> {
  async $preload(): Promise<CategoryListingConnectionResult> {
    const { categoryId, ...args } = this.$props;
    return this.$ctx.kernel
      .getServices()
      .repository.category.getCategoryListingConnection(categoryId, args);
  }

  async edges() {
    const edgesData = (await this.$get("edges")) ?? [];
    return Promise.all(
      edgesData.map(async (edge) => ({
        cursor: edge.cursor,
        node: await this.createNodeResolver(edge),
      }))
    );
  }

  async pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return (await this.$get("totalCount")) ?? 0;
  }

  private async createNodeResolver(edge: CategoryListingEdge) {
    if (edge.kind === "BUNDLE") {
      return this.resolvers.bundle(edge.nodeId);
    }

    return this.resolvers.product(edge.nodeId);
  }
}

export type { CategoryListingKind } from "../../repositories/category/CategoryRepository.js";
