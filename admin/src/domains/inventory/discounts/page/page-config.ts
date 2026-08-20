import type { FilterTransformer, SortFieldMapping, UsePageConfigReturn } from "@/hooks";
import {
  createGraphqlDateTimeRangeFilterTransformer,
  createGraphqlIntFilterTransformer,
  createGraphqlStringFilterTransformer,
} from "@/layouts/filters";
import type { ApiDiscountOrderByInput, ApiDiscountWhereInput } from "@/graphql/types";
import { DiscountOrderField } from "@/graphql/types";
import type { DiscountsQueryVariables } from "../graphql";

export const discountSortFieldMapping: SortFieldMapping<DiscountOrderField> = {
  title: DiscountOrderField.Title,
  primaryCode: DiscountOrderField.PrimaryCode,
  method: DiscountOrderField.Method,
  kind: DiscountOrderField.Kind,
  effectiveStatus: DiscountOrderField.EffectiveStatus,
  usageCount: DiscountOrderField.UsageCount,
  startsAt: DiscountOrderField.StartsAt,
  endsAt: DiscountOrderField.EndsAt,
  updatedAt: DiscountOrderField.UpdatedAt,
};

export const discountFilterTransformers: Record<
  string,
  FilterTransformer<ApiDiscountWhereInput>
> = {
  usageCount: createGraphqlIntFilterTransformer<ApiDiscountWhereInput>("usageCount"),
  startsAt: createGraphqlDateTimeRangeFilterTransformer<ApiDiscountWhereInput>("startsAt"),
  endsAt: createGraphqlDateTimeRangeFilterTransformer<ApiDiscountWhereInput>("endsAt"),
  channelCode: createGraphqlStringFilterTransformer<ApiDiscountWhereInput>("channelCode"),
  tag: createGraphqlStringFilterTransformer<ApiDiscountWhereInput>("tag"),
};

export const buildDiscountSearchCondition = (search: string): Partial<ApiDiscountWhereInput> => ({
  _or: [{ title: { _containsi: search } }, { code: { _containsi: search } }],
});

export function buildDiscountsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiDiscountWhereInput, DiscountOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): DiscountsQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: (pageConfig.orderBy ?? null) as ApiDiscountOrderByInput[] | null,
  };
}
