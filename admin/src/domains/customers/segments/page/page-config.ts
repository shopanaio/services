import { createGraphqlDateTimeRangeFilterTransformer } from "@/layouts/filters";
import type {
  FilterTransformer,
  SortFieldMapping,
  UsePageConfigReturn,
} from "@/hooks";
import { SortDirection } from "@/graphql/types";
import type {
  CustomerSegmentOrderByInput,
  CustomerSegmentsQueryVariables,
  CustomerSegmentWhereInput,
} from "../graphql/operation-types";
import { CustomerSegmentOrderField } from "../graphql/operation-types";

export const customerSegmentSortFieldMapping: SortFieldMapping<CustomerSegmentOrderField> = {
  name: CustomerSegmentOrderField.Name,
  memberCount: CustomerSegmentOrderField.MemberCount,
  createdAt: CustomerSegmentOrderField.CreatedAt,
  updatedAt: CustomerSegmentOrderField.UpdatedAt,
};

export const buildCustomerSegmentSearchCondition = (
  search: string,
): Partial<CustomerSegmentWhereInput> => ({
  _or: [
    { name: { _containsi: search } },
    { description: { _containsi: search } },
  ],
});

export const customerSegmentFilterTransformers: Record<
  string,
  FilterTransformer<CustomerSegmentWhereInput>
> = {
  createdAt: createGraphqlDateTimeRangeFilterTransformer<CustomerSegmentWhereInput>("createdAt"),
  updatedAt: createGraphqlDateTimeRangeFilterTransformer<CustomerSegmentWhereInput>("updatedAt"),
};

export function buildCustomerSegmentsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<CustomerSegmentWhereInput, CustomerSegmentOrderField>,
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
      direction: order.direction === SortDirection.Asc ? "ASC" : "DESC",
    })) as CustomerSegmentOrderByInput[] | undefined,
  };
}
