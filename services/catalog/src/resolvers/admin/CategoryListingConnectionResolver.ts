import type {
  CategoryListingConnectionResult,
  CategoryListingRelayInput,
} from "../../repositories/category/CategoryRepository.js";
import { BundleResolver } from "./BundleResolver.js";
import { CatalogType } from "./CatalogType.js";
import { ProductResolver } from "./ProductResolver.js";

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
    return edgesData.map((edge) => ({
      cursor: edge.cursor,
      node: this.createNodeResolver(edge),
    }));
  }

  async pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return (await this.$get("totalCount")) ?? 0;
  }

  private createNodeResolver(edge: CategoryListingEdge) {
    return edge.kind === "BUNDLE"
      ? new BundleResolver(edge.nodeId, this.$ctx)
      : new ProductResolver(edge.nodeId, this.$ctx);
  }
}

export type { CategoryListingKind } from "../../repositories/category/CategoryRepository.js";
