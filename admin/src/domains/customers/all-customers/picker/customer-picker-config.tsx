"use client";

import { createElement, useMemo } from "react";
import { Tag } from "antd";
import { UserOutlined } from "@ant-design/icons";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import {
  EntityCellRenderer,
} from "@/shared/components/entity-picker-modal/cell-renderers";
import {
  registerEntityPickerConfig,
} from "@/shared/components/entity-picker-modal/configs";
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
import type {
  ApiCustomer,
  CustomerOrderByInput,
  CustomerWhereInput,
} from "../graphql/operation-types";
import {
  CustomerOrderField,
  CustomerStatus,
} from "../graphql/operation-types";

interface CustomerPickerEntity extends IPickableEntity {
  email: string;
  ordersCount: number;
  customerStatus: CustomerStatus;
}

function transformCustomer(customer: ApiCustomer): CustomerPickerEntity {
  return {
    id: customer.id,
    title: customer.displayName,
    email: customer.email,
    ordersCount: customer.activity.ordersCount,
    customerStatus: customer.status,
  };
}

const statusCopy: Record<CustomerStatus, { label: string; color: string }> = {
  [CustomerStatus.Active]: { label: "Active", color: "green" },
  [CustomerStatus.Disabled]: { label: "Disabled", color: "default" },
  [CustomerStatus.Blocked]: { label: "Blocked", color: "red" },
};

function CustomerStatusCell({ value }: CustomCellRendererProps<CustomerPickerEntity, CustomerStatus>) {
  const status = statusCopy[value ?? CustomerStatus.Active];
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
  const {
    pageSize,
    first,
    after,
    last,
    before,
    where,
    orderBy,
    excludeIds,
  } = options;
  const customerWhere = useMemo<CustomerWhereInput | null>(() => {
    const conditions: CustomerWhereInput[] = [];
    if (where) conditions.push(where as CustomerWhereInput);
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
    orderBy: orderBy as CustomerOrderByInput[] | null,
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
  CustomerWhereInput,
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
