import type { CategoryConnectionInput } from "../../repositories/category/CategoryRepository.js";
import type {
  CategoryChildrenArgs,
  ProductCategoriesArgs,
  QueryCategoriesArgs,
} from "./generated/types.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type StorefrontCategoryConnectionInput =
  | QueryCategoriesArgs
  | CategoryChildrenArgs
  | ProductCategoriesArgs;

export type CategoryConnectionResolverInput =
  StorefrontCategoryConnectionInput & {
    parentId?: string;
    categoryIds?: string[];
  };

export class CategoryConnectionResolver extends BaseConnectionResolver<CategoryConnectionResolverInput> {
  async $preload(): Promise<ConnectionData> {
    const { parentId, categoryIds, ...pagination } = this.$props;
    return this.$ctx.kernel.repository.category.getConnection({
      ...pagination,
      where: {
        _and: [
          { publishedAt: { _lte: new Date().toISOString() } },
          ...(parentId ? [{ parentId: { _eq: parentId } }] : []),
          ...(categoryIds ? [{ id: { _in: categoryIds } }] : []),
        ],
      },
      orderBy: [
        { field: "handle", direction: "asc" },
        { field: "id", direction: "asc" },
      ],
    } as CategoryConnectionInput);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.category(nodeId);
  }
}
