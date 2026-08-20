"use client";

import { createElement, useMemo } from "react";
import { Tag } from "antd";
import { LuUser as UserOutlined } from "react-icons/lu";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { EntityCellRenderer } from "@/shared/components/entity-picker-modal/cell-renderers";
import { registerEntityPickerConfig } from "@/shared/components/entity-picker-modal/configs";
import type {
  IEntityPickerConfig,
  IEntityPickerDataResult,
  IPickableEntity,
} from "@/shared/components/entity-picker-modal/types";
import { useCustomers } from "../hooks";
import { filterSchema } from "../page/filter-schema";
import {
  buildCustomerSearchCondition,
  customerFilterTransformers,
  customerSortFieldMapping,
} from "../page/page-config";
import {
  type ApiCustomer,
  type ApiCustomerOrderByInput,
  type ApiCustomerWhereInput,
  CustomerOrderField,
  CustomerLifecycleStatus,
} from "@/graphql/types";

interface CustomerPickerEntity extends IPickableEntity {
  email: string;
  ordersCount: number;
  customerStatus: CustomerLifecycleStatus;
}

function transformCustomer(customer: ApiCustomer): CustomerPickerEntity {
  return {
    id: customer.id,
    title: customer.displayName,
    email: customer.email ?? "",
    ordersCount: customer.statistics?.ordersCount ?? 0,
    customerStatus: customer.lifecycleStatus,
  };
}

const statusCopy: Record<CustomerLifecycleStatus, { label: string; color: string }> = {
  [CustomerLifecycleStatus.Active]: { label: "Active", color: "green" },
  [CustomerLifecycleStatus.Disabled]: { label: "Disabled", color: "default" },
  [CustomerLifecycleStatus.Blocked]: { label: "Blocked", color: "red" },
  [CustomerLifecycleStatus.Merged]: { label: "Merged", color: "purple" },
  [CustomerLifecycleStatus.Redacted]: { label: "Redacted", color: "default" },
};

function CustomerStatusCell({
  value,
}: CustomCellRendererProps<CustomerPickerEntity, CustomerLifecycleStatus>) {
  const status = statusCopy[value ?? CustomerLifecycleStatus.Active];
  return <Tag color={status.color}>{status.label}</Tag>;
}

function useCustomersPickerData(options: {
  pageSize: number;
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: object | null;
  orderBy?: object[] | null;
  excludeIds: string[];
}): IEntityPickerDataResult<CustomerPickerEntity> {
  const { pageSize, first, after, last, before, where, orderBy, excludeIds } = options;
  const customerWhere = useMemo<ApiCustomerWhereInput | null>(() => {
    const conditions: ApiCustomerWhereInput[] = [];
    if (where) conditions.push(where as ApiCustomerWhereInput);
    if (excludeIds.length > 0) conditions.push({ id: { _notIn: excludeIds } });
    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0]!;
    return { _and: conditions };
  }, [excludeIds, where]);
  const { customers, totalCount, pageInfo, loading, error } = useCustomers({
    first,
    after,
    last,
    before,
    where: customerWhere,
    orderBy: orderBy as ApiCustomerOrderByInput[] | null,
  });
  const data = useMemo(() => customers.map(transformCustomer), [customers]);

  return {
    data,
    isLoading: loading,
    error,
    pagination: {
      total: totalCount,
      pageSize,
      hasNext: pageInfo?.hasNextPage ?? false,
      hasPrev: pageInfo?.hasPreviousPage ?? false,
      startCursor: pageInfo?.startCursor ?? null,
      endCursor: pageInfo?.endCursor ?? null,
    },
  };
}

const customerPickerColumns: ColDef<CustomerPickerEntity>[] = [
  {
    headerName: "Customer",
    colId: "displayName",
    field: "title",
    cellRenderer: EntityCellRenderer,
    cellRendererParams: { fallbackIcon: createElement(UserOutlined) },
    flex: 1,
    minWidth: 250,
  },
  {
    headerName: "Email",
    field: "email",
    minWidth: 230,
  },
  {
    headerName: "Orders",
    colId: "ordersCount",
    field: "ordersCount",
    width: 110,
  },
  {
    headerName: "Status",
    colId: "status",
    field: "customerStatus",
    cellRenderer: CustomerStatusCell,
    width: 125,
  },
];

export const customerPickerConfig: IEntityPickerConfig<
  CustomerPickerEntity,
  ApiCustomerWhereInput,
  CustomerOrderField
> = {
  entityType: "customer",
  entityName: "Customer",
  entityNamePlural: "Customers",
  filterSchema,
  columns: customerPickerColumns,
  pageConfig: {
    storageKey: "customer-picker-grid-state",
    sortFieldMapping: customerSortFieldMapping,
    buildSearchCondition: buildCustomerSearchCondition,
    filterTransformers: customerFilterTransformers,
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50],
  },
  useData: useCustomersPickerData,
  getRowId: (customer) => customer.id,
};

registerEntityPickerConfig(customerPickerConfig);
