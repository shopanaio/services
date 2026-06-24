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
  ApiTagOrderByInput,
  ApiTagWhereInput,
} from "@/graphql/types";
import { TagOrderField } from "@/graphql/types";
import type { TagsQueryVariables } from "../graphql/operation-types";

type TagsWhereInput = ApiTagWhereInput;
type TagsOrderField = TagOrderField;

export const tagSortFieldMapping: SortFieldMapping<TagsOrderField> = {
  title: TagOrderField.Name,
  name: TagOrderField.Name,
  handle: TagOrderField.Handle,
  productsCount: TagOrderField.ProductsCount,
  createdAt: TagOrderField.CreatedAt,
};

export const buildTagSearchCondition = (
  search: string,
): Partial<ApiTagWhereInput> => ({
  _or: [
    { name: { _containsi: search } },
    { handle: { _containsi: search } },
  ],
});

export const tagFilterTransformers: Record<
  string,
  FilterTransformer<ApiTagWhereInput>
> = {
  name: createGraphqlStringFilterTransformer<ApiTagWhereInput>("name"),
  handle: createGraphqlStringFilterTransformer<ApiTagWhereInput>("handle"),
  productsCount:
    createGraphqlIntFilterTransformer<ApiTagWhereInput>("productsCount"),
  createdAt: createGraphqlDateTimeRangeFilterTransformer<ApiTagWhereInput>(
    "createdAt",
  ),
};

export function buildTagsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<TagsWhereInput, TagsOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): TagsQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: (pageConfig.orderBy ?? null) as ApiTagOrderByInput[] | null,
  };
}

export function toTagsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<object, string>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): TagsQueryVariables {
  return buildTagsQueryVariables({
    ...pageConfig,
    where: pageConfig.where as ApiTagWhereInput | undefined,
    orderBy: pageConfig.orderBy as
      | OrderByInput<TagOrderField>[]
      | undefined,
  });
}

export type {
  TagsOrderField,
  TagsWhereInput,
};
