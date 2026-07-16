"use client";

import { useCallback, useMemo, useRef } from "react";
import { Alert, Avatar, Button, Flex, Tag, Typography } from "antd";
import { LuCircleCheckBig as CheckCircleFilled, LuClock as ClockCircleOutlined, LuMapPin as EnvironmentOutlined, LuMail as MailOutlined, LuPlus as PlusOutlined } from "react-icons/lu";
import { AgGridReact } from "ag-grid-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import {
  AllCommunityModule,
  GridStateModule,
  ModuleRegistry,
  type ColDef,
} from "ag-grid-community";
import { useDefaultCurrency } from "@/domains/workspace";
import {
  CustomerConsentChannel,
  CustomerConsentState,
  CustomerLifecycleStatus,
  CustomerOrderField,
  CustomerSegmentStatus,
  type ApiCustomer,
  type ApiCustomerWhereInput,
} from "@/graphql/types";
import { useAgGridTheme, usePageConfig } from "@/hooks";
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { useCustomers } from "../hooks";
import { useCustomerSegments } from "../../segments/hooks";
import { useCustomerCreateModal, useCustomerModal } from "../modals";
import { createCustomerFilterSchema } from "./filter-schema";
import {
  buildCustomerSearchCondition,
  buildCustomersQueryVariables,
  customerFilterTransformers,
  customerSortFieldMapping,
} from "./page-config";

ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);

const statusConfig: Record<CustomerLifecycleStatus, { color: string; label: string }> = {
  [CustomerLifecycleStatus.Active]: { color: "green", label: "Active" },
  [CustomerLifecycleStatus.Disabled]: { color: "default", label: "Disabled" },
  [CustomerLifecycleStatus.Blocked]: { color: "red", label: "Blocked" },
  [CustomerLifecycleStatus.Merged]: { color: "purple", label: "Merged" },
  [CustomerLifecycleStatus.Redacted]: { color: "default", label: "Redacted" },
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
  const initials = `${data.firstName?.[0] ?? ""}${data.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <Flex align="center" gap="small" style={{ minWidth: 0 }}>
      <Avatar>{initials}</Avatar>
      <Flex vertical gap={2} style={{ minWidth: 0 }}>
        <Typography.Text strong ellipsis title={data.displayName}>{data.displayName}</Typography.Text>
        <Typography.Text type="secondary" ellipsis title={data.email ?? undefined}>{data.email ?? "No email"}</Typography.Text>
      </Flex>
    </Flex>
  );
}

function StatusCell({ value }: CustomCellRendererProps<ApiCustomer, CustomerLifecycleStatus>) {
  const config = statusConfig[value ?? CustomerLifecycleStatus.Active];
  return <Tag color={config.color}>{config.label}</Tag>;
}

function MarketingCell({ value }: CustomCellRendererProps<ApiCustomer, CustomerConsentState>) {
  if (value === CustomerConsentState.Subscribed) {
    return <Flex align="center" gap={6}><CheckCircleFilled style={{ color: "#52c41a" }} /><Typography.Text>Subscribed</Typography.Text></Flex>;
  }
  if (value === CustomerConsentState.Pending) {
    return <Flex align="center" gap={6}><ClockCircleOutlined style={{ color: "#d48806" }} /><Typography.Text>Pending</Typography.Text></Flex>;
  }
  return <Flex align="center" gap={6}><MailOutlined /><Typography.Text type="secondary">Not subscribed</Typography.Text></Flex>;
}

function LocationCell({ data }: CustomCellRendererProps<ApiCustomer>) {
  if (!data?.defaultShippingAddress) return <Typography.Text type="secondary">No address</Typography.Text>;
  return (
    <Flex align="center" gap={6} style={{ minWidth: 0 }}>
      <EnvironmentOutlined style={{ color: "#8c8c8c" }} />
      <Typography.Text ellipsis title={`${data.defaultShippingAddress.city}, ${data.defaultShippingAddress.countryCode}`}>
        {data.defaultShippingAddress.city}, {data.defaultShippingAddress.countryCode}
      </Typography.Text>
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
  const segmentQuery = useCustomerSegments({
    first: 250,
    where: { status: { _eq: CustomerSegmentStatus.Active } },
  });
  const filterSchema = useMemo(
    () => createCustomerFilterSchema(
      segmentQuery.connection?.edges.map((edge) => edge.node) ?? [],
    ),
    [segmentQuery.connection],
  );
  const gridRef = useRef<AgGridReact<ApiCustomer>>(null);
  const pageConfig = usePageConfig<ApiCustomer, ApiCustomerWhereInput, CustomerOrderField>({
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
    () => ({ ...buildCustomersQueryVariables(pageConfig), currencyCode: defaultCurrency }),
    [
      pageConfig.first,
      pageConfig.after,
      pageConfig.last,
      pageConfig.before,
      pageConfig.where,
      pageConfig.orderBy,
      defaultCurrency,
    ],
  );
  const { customers, totalCount, pageInfo, loading, error, refetch } = useCustomers(variables);
  const { push: openCustomerModal } = useCustomerModal();
  const { push: openCustomerCreateModal } = useCustomerCreateModal();

  const handleCreate = useCallback(() => {
    openCustomerCreateModal({ onCreated: refetch });
  }, [openCustomerCreateModal, refetch]);

  const handleEdit = useCallback((customer: ApiCustomer) => {
    openCustomerModal({ entityId: customer.id, onSaved: refetch });
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
      field: "lifecycleStatus",
      cellRenderer: StatusCell,
      width: 120,
    },
    {
      headerName: "Marketing",
      valueGetter: ({ data }) => data?.consents.find((consent) => consent.channel === CustomerConsentChannel.Email)?.state ?? CustomerConsentState.NotSubscribed,
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
      valueGetter: ({ data }) => data?.statistics?.ordersCount ?? 0,
      width: 105,
    },
    {
      headerName: "Total spent",
      colId: "totalSpentMinor",
      valueGetter: ({ data }) => data?.monetaryStatistics.edges[0]?.node.totalSpentMinor ?? 0,
      valueFormatter: ({ value }) => formatMoney(Number(value ?? 0), defaultCurrency),
      minWidth: 135,
    },
    {
      headerName: "Last order",
      colId: "lastOrderAt",
      valueGetter: ({ data }) => data?.statistics?.lastOrderAt ?? null,
      cellRenderer: LastOrderCell,
      minWidth: 145,
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
