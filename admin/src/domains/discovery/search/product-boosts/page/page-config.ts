import type { FilterTransformer, SortFieldMapping, UsePageConfigReturn } from "@/hooks";
import {
  createGraphqlBooleanFilterTransformer,
  createGraphqlDateTimeRangeFilterTransformer,
  createGraphqlIntFilterTransformer,
  createGraphqlStringFilterTransformer,
} from "@/layouts/filters";
import type {
  ApiSearchProductBoostsMetaInput,
  ApiSearchProductBoostOrderByInput,
  ApiSearchProductBoostWhereInput,
} from "@/graphql/types";
import type { IFilterValue } from "@/layouts/filters/core/types";
import { SearchProductBoostOrderField } from "@/graphql/types";
import type { SearchProductBoostsQueryVariables } from "../graphql/operation-types";

export const productBoostSortFieldMapping: SortFieldMapping<SearchProductBoostOrderField> = {
  name: SearchProductBoostOrderField.Name,
  locale: SearchProductBoostOrderField.Locale,
  enabled: SearchProductBoostOrderField.Enabled,
  phrasesCount: SearchProductBoostOrderField.PhrasesCount,
  productsCount: SearchProductBoostOrderField.ProductsCount,
  updatedAt: SearchProductBoostOrderField.UpdatedAt,
};

export const buildProductBoostSearchCondition = (
  search: string,
): Partial<ApiSearchProductBoostWhereInput> => ({
  name: { _containsi: search },
});

export const productBoostFilterTransformers: Record<
  string,
  FilterTransformer<ApiSearchProductBoostWhereInput>
> = {
  name: createGraphqlStringFilterTransformer<ApiSearchProductBoostWhereInput>("name"),
  phrases: createGraphqlStringFilterTransformer<ApiSearchProductBoostWhereInput>("phrases"),
  locale: createGraphqlStringFilterTransformer<ApiSearchProductBoostWhereInput>("locale"),
  enabled: createGraphqlBooleanFilterTransformer<ApiSearchProductBoostWhereInput>("enabled"),
  phrasesCount: createGraphqlIntFilterTransformer<ApiSearchProductBoostWhereInput>("phrasesCount"),
  productsCount:
    createGraphqlIntFilterTransformer<ApiSearchProductBoostWhereInput>("productsCount"),
  productIds: () => null,
  updatedAt:
    createGraphqlDateTimeRangeFilterTransformer<ApiSearchProductBoostWhereInput>("updatedAt"),
};

export function buildProductBoostsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiSearchProductBoostWhereInput, SearchProductBoostOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy" | "filters"
  >,
): SearchProductBoostsQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: (pageConfig.orderBy ?? null) as ApiSearchProductBoostOrderByInput[] | null,
    meta: buildProductBoostsMeta(pageConfig.filters),
  };
}

function buildProductBoostsMeta(filters: IFilterValue[]): ApiSearchProductBoostsMetaInput | null {
  const productIds = filters
    .filter((filter) => filter.payloadKey === "productIds")
    .flatMap((filter) => (Array.isArray(filter.value) ? filter.value : [filter.value]))
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  return productIds.length > 0 ? { productIds: [...new Set(productIds)] } : null;
}
