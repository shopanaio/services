import type {
  CategoryConnectionInput,
  CategoryRelayInput,
} from "../../repositories/category/CategoryRepository.js";
import { CategoryResolver } from "./CategoryResolver.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type { CategoryConnectionInput };

type CategoryHierarchyScopeArgs = {
  referenceId: string;
  direction: "ANCESTORS" | "DESCENDANTS";
  includeReference?: boolean | null;
  mode?: "INCLUDE" | "EXCLUDE" | null;
};

type CategoryCategoriesMetaArgs = {
  hierarchyScope?: CategoryHierarchyScopeArgs | null;
  productsScope?: CategoryProductsScopeArgs | null;
};

export type CategoryQueryCategoriesArgs = CategoryRelayInput & {
  meta?: CategoryCategoriesMetaArgs | null;
};

type CategoryProductsScopeArgs = {
  referenceIds: string[];
  mode: "INCLUDE" | "EXCLUDE";
};

/**
 * CategoryConnection - resolves paginated category list
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class CategoryConnectionResolver extends BaseConnectionResolver<CategoryConnectionInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel
      .getServices()
      .repository.category.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return new CategoryResolver(nodeId, this.$ctx);
  }
}
