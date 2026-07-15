"use client";

import { useCallback, useMemo, useRef } from "react";
import { Alert, Avatar, Button, Flex, Tag, Typography } from "antd";
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  EnvironmentOutlined,
  MailOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import {
  AllCommunityModule,
  GridStateModule,
  ModuleRegistry,
  type ColDef,
} from "ag-grid-community";
import { useDefaultCurrency } from "@/domains/workspace";
import { useAgGridTheme, usePageConfig } from "@/hooks";
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { useCustomers } from "../hooks";
import { useCustomerModal } from "../modals";
import type {
  ApiCustomer,
  CustomerWhereInput,
} from "../graphql/operation-types";
import {
  CustomerMarketingState,
  CustomerOrderField,
  CustomerRiskLevel,
  CustomerStatus,
} from "../graphql/operation-types";
import { filterSchema } from "./filter-schema";
import {
  buildCustomerSearchCondition,
  buildCustomersQueryVariables,
  customerFilterTransformers,
  customerSortFieldMapping,
} from "./page-config";

ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);

const statusConfig: Record<CustomerStatus, { color: string; label: string }> = {
  [CustomerStatus.Active]: { color: "green", label: "Active" },
  [CustomerStatus.Disabled]: { color: "default", label: "Disabled" },
  [CustomerStatus.Blocked]: { color: "red", label: "Blocked" },
};

const riskConfig: Record<CustomerRiskLevel, { color: string; label: string }> = {
  [CustomerRiskLevel.Low]: { color: "default", label: "Low" },
  [CustomerRiskLevel.Medium]: { color: "gold", label: "Medium" },
  [CustomerRiskLevel.High]: { color: "red", label: "High" },
};

const customerDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatMoney(amountMinor: number, currency: string | null): string {
  if (!currency) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(amountMinor / 100);
}

function CustomerCell({ data }: CustomCellRendererProps<ApiCustomer>) {
  if (!data) return null;
  const initials = `${data.firstName[0] ?? ""}${data.lastName[0] ?? ""}`.toUpperCase();

  return (
    <Flex align="center" gap="small" style={{ minWidth: 0 }}>
      <Avatar>{initials}</Avatar>
      <Flex vertical gap={2} style={{ minWidth: 0 }}>
        <Typography.Text strong ellipsis title={data.displayName}>{data.displayName}</Typography.Text>
        <Typography.Text type="secondary" ellipsis title={data.email}>{data.email}</Typography.Text>
      </Flex>
    </Flex>
  );
}

function StatusCell({ value }: CustomCellRendererProps<ApiCustomer, CustomerStatus>) {
  const config = statusConfig[value ?? CustomerStatus.Active];
  return <Tag color={config.color}>{config.label}</Tag>;
}

function MarketingCell({ value }: CustomCellRendererProps<ApiCustomer, CustomerMarketingState>) {
  if (value === CustomerMarketingState.Subscribed) {
    return <Flex align="center" gap={6}><CheckCircleFilled style={{ color: "#52c41a" }} /><Typography.Text>Subscribed</Typography.Text></Flex>;
  }
  if (value === CustomerMarketingState.Pending) {
    return <Flex align="center" gap={6}><ClockCircleOutlined style={{ color: "#d48806" }} /><Typography.Text>Pending</Typography.Text></Flex>;
  }
  return <Flex align="center" gap={6}><MailOutlined /><Typography.Text type="secondary">Not subscribed</Typography.Text></Flex>;
}

function LocationCell({ data }: CustomCellRendererProps<ApiCustomer>) {
  if (!data?.defaultAddress) return <Typography.Text type="secondary">No address</Typography.Text>;
  return (
    <Flex align="center" gap={6} style={{ minWidth: 0 }}>
      <EnvironmentOutlined style={{ color: "#8c8c8c" }} />
      <Typography.Text ellipsis title={`${data.defaultAddress.city}, ${data.defaultAddress.countryCode}`}>
        {data.defaultAddress.city}, {data.defaultAddress.countryCode}
      </Typography.Text>
    </Flex>
  );
}

function RiskCell({ data }: CustomCellRendererProps<ApiCustomer>) {
  if (!data) return null;
  const config = riskConfig[data.moderation.riskLevel];
  return (
    <Flex align="center" gap={6}>
      {data.moderation.riskLevel !== CustomerRiskLevel.Low ? <SafetyCertificateOutlined /> : null}
      <Tag color={config.color}>{config.label}</Tag>
      {data.moderation.complaintCount > 0 ? <Typography.Text type="danger">{data.moderation.complaintCount}</Typography.Text> : null}
    </Flex>
  );
}

function LastOrderCell({ value }: CustomCellRendererProps<ApiCustomer, string | null>) {
  return value
    ? <Typography.Text>{customerDateFormatter.format(new Date(value))}</Typography.Text>
    : <Typography.Text type="secondary">No orders</Typography.Text>;
}

export default function AllCustomersPage() {
  const agGridTheme = useAgGridTheme();
  const defaultCurrency = useDefaultCurrency();
  const gridRef = useRef<AgGridReact<ApiCustomer>>(null);
  const pageConfig = usePageConfig<ApiCustomer, CustomerWhereInput, CustomerOrderField>({
    gridRef,
    storageKey: "customers-grid-state",
    filterSchema,
    sortFieldMapping: customerSortFieldMapping,
    defaultSort: [{ colId: "lastOrderAt", sort: "desc" }],
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    buildSearchCondition: buildCustomerSearchCondition,
    filterTransformers: customerFilterTransformers,
  });
  const variables = useMemo(
    () => buildCustomersQueryVariables(pageConfig),
    [
      pageConfig.first,
      pageConfig.after,
      pageConfig.last,
      pageConfig.before,
      pageConfig.where,
      pageConfig.orderBy,
    ],
  );
  const { customers, totalCount, pageInfo, loading, error, refetch } = useCustomers(variables);
  const { push: openCustomerModal } = useCustomerModal();

  const handleCreate = useCallback(() => {
    openCustomerModal({ mode: "create", onSaved: refetch });
  }, [openCustomerModal, refetch]);

  const handleEdit = useCallback((customer: ApiCustomer) => {
    openCustomerModal({ mode: "edit", entityId: customer.id, onSaved: refetch });
  }, [openCustomerModal, refetch]);

  const handleNextPage = useCallback(() => {
    if (pageInfo?.endCursor) pageConfig.goToNextPage(pageInfo.endCursor);
  }, [pageConfig, pageInfo?.endCursor]);

  const handlePrevPage = useCallback(() => {
    if (pageInfo?.startCursor) pageConfig.goToPrevPage(pageInfo.startCursor);
  }, [pageConfig, pageInfo?.startCursor]);

  const columnDefs = useMemo<ColDef<ApiCustomer>[]>(() => [
    {
      headerName: "Customer",
      colId: "displayName",
      cellRenderer: CustomerCell,
      minWidth: 280,
      flex: 2,
    },
    {
      headerName: "Status",
      field: "status",
      cellRenderer: StatusCell,
      width: 120,
    },
    {
      headerName: "Marketing",
      field: "emailMarketingState",
      cellRenderer: MarketingCell,
      minWidth: 165,
      sortable: false,
    },
    {
      headerName: "Location",
      colId: "location",
      cellRenderer: LocationCell,
      minWidth: 165,
      sortable: false,
    },
    {
      headerName: "Orders",
      colId: "ordersCount",
      valueGetter: ({ data }) => data?.activity.ordersCount ?? 0,
      width: 105,
    },
    {
      headerName: "Total spent",
      colId: "totalSpentMinor",
      valueGetter: ({ data }) => data?.activity.totalSpentMinor ?? 0,
      valueFormatter: ({ value }) => formatMoney(Number(value ?? 0), defaultCurrency),
      minWidth: 135,
    },
    {
      headerName: "Last order",
      colId: "lastOrderAt",
      valueGetter: ({ data }) => data?.activity.lastOrderAt ?? null,
      cellRenderer: LastOrderCell,
      minWidth: 145,
    },
    {
      headerName: "Risk",
      colId: "riskLevel",
      cellRenderer: RiskCell,
      minWidth: 130,
    },
  ], [defaultCurrency]);

  const defaultColDef = useMemo<ColDef<ApiCustomer>>(() => ({
    resizable: true,
    sortable: true,
    comparator: () => 0,
    cellStyle: { display: "flex", alignItems: "center" },
  }), []);

  return (
    <DataLayout
      fullWidth
      name="customers"
      title="Customers"
      count={totalCount}
      actions={<Button icon={<PlusOutlined />} onClick={handleCreate}>Create customer</Button>}
    >
      <DataLayout.Toolbar
        left={<FilterWidget {...pageConfig.filterWidgetProps} searchPlaceholder="Search name, email, or phone..." />}
      />

      <div style={{ height: "100%", paddingBottom: 16, display: "flex", flexDirection: "column" }}>
        {error ? <Alert type="error" message={error.message} showIcon style={{ marginBottom: 12 }} /> : null}

        <div style={{ flex: 1 }} data-testid="customers-table">
          <AgGridReact<ApiCustomer>
            ref={gridRef}
            theme={agGridTheme}
            rowData={customers}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={64}
            suppressCellFocus
            suppressMovableColumns
            rowStyle={{ cursor: "pointer" }}
            onRowClicked={({ data }) => { if (data) handleEdit(data); }}
            onSortChanged={pageConfig.onSortChanged}
            initialState={pageConfig.gridStateProps.initialState}
            onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
          />
        </div>

        <CursorPagination
          name="customers"
          total={totalCount}
          rangeStart={pageConfig.getRangeStart(customers.length)}
          rangeEnd={Math.min(pageConfig.getRangeEnd(customers.length), totalCount)}
          pageSize={pageConfig.pageSize}
          pageSizeOptions={pageConfig.pageSizeOptions}
          hasNext={pageInfo?.hasNextPage ?? false}
          hasPrev={pageInfo?.hasPreviousPage ?? false}
          onNext={handleNextPage}
          onPrev={handlePrevPage}
          onPageSizeChange={pageConfig.setPageSize}
        />
      </div>
    </DataLayout>
  );
}
