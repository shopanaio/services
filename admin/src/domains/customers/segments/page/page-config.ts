import { createGraphqlDateTimeRangeFilterTransformer } from "@/layouts/filters";
import type { FilterTransformer, SortFieldMapping, UsePageConfigReturn } from "@/hooks";
import {
  CustomerSegmentOrderField,
  SortDirection,
  type ApiCustomerSegmentOrderByInput,
  type ApiCustomerSegmentWhereInput,
} from "@/graphql/types";
import type { CustomerSegmentsQueryVariables } from "../graphql/operation-types";

export const customerSegmentSortFieldMapping: SortFieldMapping<CustomerSegmentOrderField> = {
  name: CustomerSegmentOrderField.Name,
  customersCount: CustomerSegmentOrderField.CustomersCount,
  createdAt: CustomerSegmentOrderField.CreatedAt,
  updatedAt: CustomerSegmentOrderField.UpdatedAt,
};

export const buildCustomerSegmentSearchCondition = (
  search: string,
): Partial<ApiCustomerSegmentWhereInput> => ({
  _or: [{ name: { _containsi: search } }, { description: { _containsi: search } }],
});

export const customerSegmentFilterTransformers: Record<
  string,
  FilterTransformer<ApiCustomerSegmentWhereInput>
> = {
  createdAt: createGraphqlDateTimeRangeFilterTransformer<ApiCustomerSegmentWhereInput>("createdAt"),
  updatedAt: createGraphqlDateTimeRangeFilterTransformer<ApiCustomerSegmentWhereInput>("updatedAt"),
};

export function buildCustomerSegmentsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiCustomerSegmentWhereInput, CustomerSegmentOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): CustomerSegmentsQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: pageConfig.orderBy?.map((order) => ({
      field: order.field,
      direction: order.direction === SortDirection.Asc ? SortDirection.Asc : SortDirection.Desc,
    })) as ApiCustomerSegmentOrderByInput[] | undefined,
  };
}
