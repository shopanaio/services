import { createGraphqlDateTimeRangeFilterTransformer } from "@/layouts/filters";
import {
  createMinorUnitPriceTransformer,
  type FilterTransformer,
  type SortFieldMapping,
  type UsePageConfigReturn,
} from "@/hooks";
import {
  CustomerOrderField,
  SortDirection,
  type ApiCustomerOrderByInput,
  type ApiCustomerWhereInput,
} from "@/graphql/types";
import type { CustomersQueryVariables } from "../graphql/operation-types";

export const customerSortFieldMapping: SortFieldMapping<CustomerOrderField> = {
  displayName: CustomerOrderField.DisplayName,
  email: CustomerOrderField.Email,
  lifecycleStatus: CustomerOrderField.LifecycleStatus,
  ordersCount: CustomerOrderField.OrdersCount,
  totalSpentMinor: CustomerOrderField.TotalSpentMinor,
  lastOrderAt: CustomerOrderField.LastOrderAt,
  createdAt: CustomerOrderField.CreatedAt,
  updatedAt: CustomerOrderField.UpdatedAt,
};

export const buildCustomerSearchCondition = (search: string): Partial<ApiCustomerWhereInput> => ({
  _or: [
    { displayName: { _containsi: search } },
    { email: { _containsi: search } },
    { phoneE164: { _containsi: search } },
  ],
});

export const customerFilterTransformers: Record<
  string,
  FilterTransformer<ApiCustomerWhereInput>
> = {
  totalSpentMinor: createMinorUnitPriceTransformer<ApiCustomerWhereInput>("totalSpentMinor"),
  lastOrderAt: createGraphqlDateTimeRangeFilterTransformer<ApiCustomerWhereInput>("lastOrderAt"),
  createdAt: createGraphqlDateTimeRangeFilterTransformer<ApiCustomerWhereInput>("createdAt"),
};

export function buildCustomersQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiCustomerWhereInput, CustomerOrderField>,
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
      direction: order.direction === SortDirection.Asc ? SortDirection.Asc : SortDirection.Desc,
    })) as ApiCustomerOrderByInput[] | undefined,
  };
}
