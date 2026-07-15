import {
  createGraphqlDateTimeRangeFilterTransformer,
} from "@/layouts/filters";
import {
  createMinorUnitPriceTransformer,
  type FilterTransformer,
  type SortFieldMapping,
  type UsePageConfigReturn,
} from "@/hooks";
import { SortDirection } from "@/graphql/types";
import type {
  CustomerOrderByInput,
  CustomersQueryVariables,
  CustomerWhereInput,
} from "../graphql/operation-types";
import { CustomerOrderField } from "../graphql/operation-types";

export const customerSortFieldMapping: SortFieldMapping<CustomerOrderField> = {
  displayName: CustomerOrderField.DisplayName,
  email: CustomerOrderField.Email,
  status: CustomerOrderField.Status,
  riskLevel: CustomerOrderField.RiskLevel,
  ordersCount: CustomerOrderField.OrdersCount,
  totalSpentMinor: CustomerOrderField.TotalSpentMinor,
  lastOrderAt: CustomerOrderField.LastOrderAt,
  createdAt: CustomerOrderField.CreatedAt,
  updatedAt: CustomerOrderField.UpdatedAt,
};

export const buildCustomerSearchCondition = (
  search: string,
): Partial<CustomerWhereInput> => ({
  _or: [
    { displayName: { _containsi: search } },
    { email: { _containsi: search } },
    { phone: { _containsi: search } },
  ],
});

export const customerFilterTransformers: Record<
  string,
  FilterTransformer<CustomerWhereInput>
> = {
  totalSpentMinor: createMinorUnitPriceTransformer<CustomerWhereInput>("totalSpentMinor"),
  lastOrderAt: createGraphqlDateTimeRangeFilterTransformer<CustomerWhereInput>("lastOrderAt"),
  createdAt: createGraphqlDateTimeRangeFilterTransformer<CustomerWhereInput>("createdAt"),
};

export function buildCustomersQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<CustomerWhereInput, CustomerOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): CustomersQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: pageConfig.orderBy?.map((order) => ({
      field: order.field,
      direction: order.direction === SortDirection.Asc ? "ASC" : "DESC",
    })) as CustomerOrderByInput[] | undefined,
  };
}
