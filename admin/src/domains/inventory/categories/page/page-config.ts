import type {
  FilterTransformer,
  OrderByInput,
  SortFieldMapping,
  UsePageConfigReturn,
} from "@/hooks";
import {
  createGraphqlDateTimeRangeFilterTransformer,
  createGraphqlIntFilterTransformer,
  createGraphqlStringFilterTransformer,
} from "@/layouts/filters";
import type {
  ApiCategoryOrderByInput,
  ApiCategoryWhereInput,
} from "@/graphql/types";
import { CategoryOrderField } from "@/graphql/types";
import type { CategoriesQueryVariables } from "../graphql/operation-types";

export const categorySortFieldMapping: SortFieldMapping<CategoryOrderField> = {
  title: CategoryOrderField.Name,
  name: CategoryOrderField.Name,
  handle: CategoryOrderField.Handle,
  depth: CategoryOrderField.Depth,
  productsCount: CategoryOrderField.ProductsCount,
  createdAt: CategoryOrderField.CreatedAt,
  updatedAt: CategoryOrderField.UpdatedAt,
  publishedAt: CategoryOrderField.PublishedAt,
};

export const buildCategorySearchCondition = (
  search: string,
): Partial<ApiCategoryWhereInput> => ({
  _or: [
    { name: { _containsi: search } },
    { handle: { _containsi: search } },
  ],
});

export const categoryFilterTransformers: Record<
  string,
  FilterTransformer<ApiCategoryWhereInput>
> = {
  name: createGraphqlStringFilterTransformer<ApiCategoryWhereInput>("name"),
  handle: createGraphqlStringFilterTransformer<ApiCategoryWhereInput>("handle"),
  depth: createGraphqlIntFilterTransformer<ApiCategoryWhereInput>("depth"),
  productsCount:
    createGraphqlIntFilterTransformer<ApiCategoryWhereInput>("productsCount"),
  publishedAt:
    createGraphqlDateTimeRangeFilterTransformer<ApiCategoryWhereInput>(
      "publishedAt",
    ),
  createdAt: createGraphqlDateTimeRangeFilterTransformer<ApiCategoryWhereInput>(
    "createdAt",
  ),
  updatedAt: createGraphqlDateTimeRangeFilterTransformer<ApiCategoryWhereInput>(
    "updatedAt",
  ),
};

export function buildCategoriesQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiCategoryWhereInput, CategoryOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): CategoriesQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: (pageConfig.orderBy ?? null) as ApiCategoryOrderByInput[] | null,
  };
}

export function toCategoriesQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<object, string>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): CategoriesQueryVariables {
  return buildCategoriesQueryVariables({
    ...pageConfig,
    where: pageConfig.where as ApiCategoryWhereInput | undefined,
    orderBy: pageConfig.orderBy as
      | OrderByInput<CategoryOrderField>[]
      | undefined,
  });
}
