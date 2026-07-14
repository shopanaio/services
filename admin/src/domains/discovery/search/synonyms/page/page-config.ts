import type {
  FilterTransformer,
  SortFieldMapping,
  UsePageConfigReturn,
} from "@/hooks";
import {
  createGraphqlBooleanFilterTransformer,
  createGraphqlDateTimeRangeFilterTransformer,
  createGraphqlIntFilterTransformer,
  createGraphqlStringFilterTransformer,
} from "@/layouts/filters";
import type {
  ApiSearchSynonymGroupOrderByInput,
  ApiSearchSynonymGroupWhereInput,
} from "@/graphql/types";
import { SearchSynonymGroupOrderField } from "@/graphql/types";
import type { SearchSynonymGroupsQueryVariables } from "../graphql/operation-types";

export const synonymGroupSortFieldMapping: SortFieldMapping<SearchSynonymGroupOrderField> = {
  name: SearchSynonymGroupOrderField.Name,
  locale: SearchSynonymGroupOrderField.Locale,
  enabled: SearchSynonymGroupOrderField.Enabled,
  valuesCount: SearchSynonymGroupOrderField.ValuesCount,
  updatedAt: SearchSynonymGroupOrderField.UpdatedAt,
};

export const buildSynonymGroupSearchCondition = (
  search: string,
): Partial<ApiSearchSynonymGroupWhereInput> => ({
  name: { _containsi: search },
});

export const synonymGroupFilterTransformers: Record<
  string,
  FilterTransformer<ApiSearchSynonymGroupWhereInput>
> = {
  name: createGraphqlStringFilterTransformer<ApiSearchSynonymGroupWhereInput>(
    "name",
  ),
  terms: createGraphqlStringFilterTransformer<ApiSearchSynonymGroupWhereInput>(
    "terms",
  ),
  locale:
    createGraphqlStringFilterTransformer<ApiSearchSynonymGroupWhereInput>(
      "locale",
    ),
  enabled:
    createGraphqlBooleanFilterTransformer<ApiSearchSynonymGroupWhereInput>(
      "enabled",
    ),
  valuesCount:
    createGraphqlIntFilterTransformer<ApiSearchSynonymGroupWhereInput>(
      "valuesCount",
    ),
  updatedAt:
    createGraphqlDateTimeRangeFilterTransformer<ApiSearchSynonymGroupWhereInput>(
      "updatedAt",
    ),
};

export function buildSynonymGroupsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<
      ApiSearchSynonymGroupWhereInput,
      SearchSynonymGroupOrderField
    >,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): SearchSynonymGroupsQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: (pageConfig.orderBy ??
      null) as ApiSearchSynonymGroupOrderByInput[] | null,
  };
}
