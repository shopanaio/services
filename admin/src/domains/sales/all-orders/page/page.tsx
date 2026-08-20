"use client";
import { useCallback, useMemo, useRef } from "react";
import { Alert, Avatar, Button, Flex, Tag, Typography } from "antd";
import { LuPlus as PlusOutlined, LuTruck as TruckOutlined } from "react-icons/lu";
import { AgGridReact } from "ag-grid-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import {
  AllCommunityModule,
  GridStateModule,
  ModuleRegistry,
  type ColDef,
} from "ag-grid-community";
import { useDefaultCurrency } from "@/domains/workspace";
import { AdminAppExtensionPoint } from "@/domains/apps";
import { useAgGridTheme, usePageConfig } from "@/hooks";
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { useOrders } from "../hooks";
import { useOrderModal } from "../modals";
import {
  OrderFulfillmentStatus,
  OrderOrderField,
  OrderPaymentStatus,
  type ApiOrder,
  type OrderWhereInput,
} from "../graphql/operation-types";
import {
  fulfillmentStatusConfig,
  orderStatusConfig,
  paymentStatusConfig,
} from "../components/status/status-config";
import { formatOrderMoney } from "../components/money/price";
import { filterSchema } from "./filter-schema";
import {
  buildOrderSearchCondition,
  buildOrdersQueryVariables,
  orderFilterTransformers,
  orderSortFieldMapping,
} from "./page-config";
ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);
function OrderCell({ data }: CustomCellRendererProps<ApiOrder>) {
  if (!data) return null;
  return (
    <Flex vertical>
      <Typography.Text strong>#{data.orderNumber}</Typography.Text>
      <Typography.Text type="secondary">
        {new Date(data.createdAt).toLocaleDateString()}
      </Typography.Text>
    </Flex>
  );
}
function CustomerCell({ data }: CustomCellRendererProps<ApiOrder>) {
  if (!data) return null;
  const name =
    `${data.customerDetails.firstName} ${data.customerDetails.lastName}`.trim() || "Guest";
  return (
    <Flex align="center" gap="small" style={{ minWidth: 0 }}>
      <Avatar>{name[0]?.toUpperCase()}</Avatar>
      <Flex vertical style={{ minWidth: 0 }}>
        <Typography.Text ellipsis>{name}</Typography.Text>
        <Typography.Text type="secondary" ellipsis>
          {data.customerDetails.email}
        </Typography.Text>
      </Flex>
    </Flex>
  );
}
function ItemsCell({ data }: CustomCellRendererProps<ApiOrder>) {
  if (!data) return null;
  return (
    <Typography.Text>
      {data.orderItems
        .slice(0, 2)
        .map((item) => item.product.title)
        .join(", ")}
      {data.orderItems.length > 2 ? ` +${data.orderItems.length - 2}` : ""}
    </Typography.Text>
  );
}
function OrderStatusCell({ data }: CustomCellRendererProps<ApiOrder>) {
  if (!data) return null;
  const value = orderStatusConfig[data.status];
  return <Tag color={value.color}>{value.label}</Tag>;
}
function PaymentCell({ data }: CustomCellRendererProps<ApiOrder>) {
  const status = data?.paymentItem?.status ?? OrderPaymentStatus.Pending;
  const value = paymentStatusConfig[status];
  return <Tag color={value.color}>{value.label}</Tag>;
}
function FulfillmentCell({ data }: CustomCellRendererProps<ApiOrder>) {
  const status = data?.fulfillments[0]?.status ?? OrderFulfillmentStatus.Pending;
  const value = fulfillmentStatusConfig[status];
  return <Tag color={value.color}>{value.label}</Tag>;
}
function DeliveryCell({ data }: CustomCellRendererProps<ApiOrder>) {
  const tracked = data?.fulfillments.some((value) => value.shippingItem?.trackingCode);
  return (
    <Flex gap={6}>
      <TruckOutlined />
      <Typography.Text>
        {data?.shippingMethod?.name ?? "Not set"}
        {tracked ? " · tracked" : ""}
      </Typography.Text>
    </Flex>
  );
}
function AppRowActionsCell({ data }: CustomCellRendererProps<ApiOrder>) {
  return data ? (
    <AdminAppExtensionPoint point="orders.list.row.actions" context={{ orderId: data.id }} />
  ) : null;
}
export default function AllOrdersPage() {
  const theme = useAgGridTheme();
  const currency = useDefaultCurrency();
  const gridRef = useRef<AgGridReact<ApiOrder>>(null);
  const pageConfig = usePageConfig<ApiOrder, OrderWhereInput, OrderOrderField>({
    gridRef,
    storageKey: "orders-grid-state",
    filterSchema,
    sortFieldMapping: orderSortFieldMapping,
    defaultSort: [
      { colId: "updatedAt", sort: "desc" },
      { colId: "orderNumber", sort: "desc" },
    ],
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    buildSearchCondition: buildOrderSearchCondition,
    filterTransformers: orderFilterTransformers,
  });
  const variables = useMemo(
    () => buildOrdersQueryVariables(pageConfig),
    [
      pageConfig.first,
      pageConfig.after,
      pageConfig.last,
      pageConfig.before,
      pageConfig.where,
      pageConfig.orderBy,
    ],
  );
  const { orders, totalCount, pageInfo, loading, error, refetch } = useOrders(variables);
  const modal = useOrderModal();
  const create = useCallback(
    () => modal.push({ mode: "create", onSaved: refetch }),
    [modal, refetch],
  );
  const edit = useCallback(
    (order: ApiOrder) => modal.push({ mode: "edit", entityId: order.id, onSaved: refetch }),
    [modal, refetch],
  );
  const next = useCallback(() => {
    if (pageInfo?.endCursor) pageConfig.goToNextPage(pageInfo.endCursor);
  }, [pageConfig, pageInfo?.endCursor]);
  const prev = useCallback(() => {
    if (pageInfo?.startCursor) pageConfig.goToPrevPage(pageInfo.startCursor);
  }, [pageConfig, pageInfo?.startCursor]);
  const columns = useMemo<ColDef<ApiOrder>[]>(
    () => [
      { headerName: "Order", colId: "orderNumber", cellRenderer: OrderCell, width: 135 },
      {
        headerName: "Customer",
        colId: "customerName",
        cellRenderer: CustomerCell,
        minWidth: 230,
        flex: 2,
      },
      {
        headerName: "Items",
        colId: "items",
        cellRenderer: ItemsCell,
        minWidth: 190,
        sortable: false,
      },
      {
        headerName: "Total",
        colId: "totalAmount",
        valueGetter: ({ data }) => data?.paymentSummary.totalAmount ?? 0,
        valueFormatter: ({ value }) => formatOrderMoney(Number(value ?? 0), currency),
        width: 125,
      },
      { headerName: "Order status", colId: "status", cellRenderer: OrderStatusCell, width: 135 },
      { headerName: "Payment", colId: "paymentStatus", cellRenderer: PaymentCell, width: 125 },
      {
        headerName: "Fulfillment",
        colId: "fulfillmentStatus",
        cellRenderer: FulfillmentCell,
        width: 145,
      },
      {
        headerName: "Delivery",
        colId: "delivery",
        cellRenderer: DeliveryCell,
        minWidth: 170,
        sortable: false,
      },
      {
        headerName: "Updated",
        colId: "updatedAt",
        valueGetter: ({ data }) => data?.updatedAt,
        valueFormatter: ({ value }) => (value ? new Date(String(value)).toLocaleString() : "—"),
        minWidth: 175,
      },
      {
        headerName: "",
        colId: "appActions",
        cellRenderer: AppRowActionsCell,
        width: 80,
        sortable: false,
      },
    ],
    [currency],
  );
  const defaultColDef = useMemo<ColDef<ApiOrder>>(
    () => ({
      sortable: true,
      resizable: true,
      comparator: () => 0,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    [],
  );
  return (
    <DataLayout
      fullWidth
      name="orders"
      title="All Orders"
      count={totalCount}
      actions={
        <Flex gap="small">
          <AdminAppExtensionPoint
            point="orders.list.toolbar.actions"
            context={{ selectedOrderIds: [] }}
          />
          <Button icon={<PlusOutlined />} onClick={create}>
            Create order
          </Button>
        </Flex>
      }
    >
      <DataLayout.Toolbar
        left={
          <FilterWidget
            {...pageConfig.filterWidgetProps}
            searchPlaceholder="Search order, customer, or tracking..."
          />
        }
      />
      <div style={{ height: "100%", paddingBottom: 16, display: "flex", flexDirection: "column" }}>
        {error ? (
          <Alert type="error" message={error.message} showIcon style={{ marginBottom: 12 }} />
        ) : null}
        <div style={{ flex: 1 }} data-testid="orders-table">
          <AgGridReact<ApiOrder>
            ref={gridRef}
            theme={theme}
            rowData={orders}
            loading={loading}
            columnDefs={columns}
            defaultColDef={defaultColDef}
            getRowId={({ data }) => data.id}
            rowHeight={64}
            suppressCellFocus
            suppressMovableColumns
            rowStyle={{ cursor: "pointer" }}
            onRowClicked={({ data }) => data && edit(data)}
            onSortChanged={pageConfig.onSortChanged}
            initialState={pageConfig.gridStateProps.initialState}
            onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
          />
        </div>
        <CursorPagination
          name="orders"
          total={totalCount}
          rangeStart={pageConfig.getRangeStart(orders.length)}
          rangeEnd={Math.min(pageConfig.getRangeEnd(orders.length), totalCount)}
          pageSize={pageConfig.pageSize}
          pageSizeOptions={pageConfig.pageSizeOptions}
          hasNext={pageInfo?.hasNextPage ?? false}
          hasPrev={pageInfo?.hasPreviousPage ?? false}
          onNext={next}
          onPrev={prev}
          onPageSizeChange={pageConfig.setPageSize}
        />
      </div>
    </DataLayout>
  );
}
