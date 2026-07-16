"use client";

import { useCallback, useMemo, useRef } from "react";
import { Alert, Button, Flex, Tag, Typography } from "antd";
import { PlusOutlined, TeamOutlined } from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import {
  AllCommunityModule,
  GridStateModule,
  ModuleRegistry,
  type ColDef,
} from "ag-grid-community";
import { useAgGridTheme, usePageConfig } from "@/hooks";
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import {
  CustomerSegmentOrderField,
  CustomerSegmentType,
  type ApiCustomerSegment,
  type ApiCustomerSegmentWhereInput,
} from "@/graphql/types";
import { useCustomerSegments } from "../hooks";
import { useCustomerSegmentModal } from "../modals";
import { filterSchema } from "./filter-schema";
import {
  buildCustomerSegmentSearchCondition,
  buildCustomerSegmentsQueryVariables,
  customerSegmentFilterTransformers,
  customerSegmentSortFieldMapping,
} from "./page-config";

ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);

const segmentDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function SegmentCell({ data }: CustomCellRendererProps<ApiCustomerSegment>) {
  if (!data) return null;
  return (
    <Flex align="center" gap="small" style={{ minWidth: 0 }}>
      <span
        aria-hidden
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: data.color ?? "#8c8c8c",
          flex: "0 0 auto",
        }}
      />
      <Flex vertical gap={2} style={{ minWidth: 0 }}>
        <Typography.Text strong ellipsis title={data.name}>{data.name}</Typography.Text>
        <Typography.Text type="secondary" ellipsis title={data.description ?? undefined}>
          {data.description ?? "No description"}
        </Typography.Text>
      </Flex>
    </Flex>
  );
}

function MemberCountCell({ value }: CustomCellRendererProps<ApiCustomerSegment, number>) {
  return (
    <Flex align="center" gap={7}>
      <TeamOutlined />
      <Typography.Text>{value ?? 0}</Typography.Text>
    </Flex>
  );
}

function SegmentTypeCell({ value }: CustomCellRendererProps<ApiCustomerSegment, CustomerSegmentType>) {
  return <Tag color="blue">{value === CustomerSegmentType.Manual ? "Manual" : value}</Tag>;
}

function DateCell({ value }: CustomCellRendererProps<ApiCustomerSegment, string>) {
  return <Typography.Text>{value ? segmentDateFormatter.format(new Date(value)) : ""}</Typography.Text>;
}

export default function CustomerSegmentsPage() {
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiCustomerSegment>>(null);
  const pageConfig = usePageConfig<
    ApiCustomerSegment,
    ApiCustomerSegmentWhereInput,
    CustomerSegmentOrderField
  >({
    gridRef,
    storageKey: "customer-segments-grid-state",
    filterSchema,
    sortFieldMapping: customerSegmentSortFieldMapping,
    defaultSort: [{ colId: "updatedAt", sort: "desc" }],
    defaultPageSize: 10,
    pageSizeOptions: [10, 20, 50],
    buildSearchCondition: buildCustomerSegmentSearchCondition,
    filterTransformers: customerSegmentFilterTransformers,
  });
  const variables = useMemo(
    () => buildCustomerSegmentsQueryVariables(pageConfig),
    [
      pageConfig.first,
      pageConfig.after,
      pageConfig.last,
      pageConfig.before,
      pageConfig.where,
      pageConfig.orderBy,
    ],
  );
  const { segments, totalCount, pageInfo, loading, error, refetch } = useCustomerSegments(variables);
  const { push: openSegmentModal } = useCustomerSegmentModal();

  const handleCreate = useCallback(() => {
    openSegmentModal({ mode: "create", onSaved: refetch });
  }, [openSegmentModal, refetch]);

  const handleEdit = useCallback((segment: ApiCustomerSegment) => {
    openSegmentModal({ mode: "edit", entityId: segment.id, onSaved: refetch });
  }, [openSegmentModal, refetch]);

  const handleNextPage = useCallback(() => {
    if (pageInfo?.endCursor) pageConfig.goToNextPage(pageInfo.endCursor);
  }, [pageConfig, pageInfo?.endCursor]);

  const handlePrevPage = useCallback(() => {
    if (pageInfo?.startCursor) pageConfig.goToPrevPage(pageInfo.startCursor);
  }, [pageConfig, pageInfo?.startCursor]);

  const columnDefs = useMemo<ColDef<ApiCustomerSegment>[]>(() => [
    {
      headerName: "Segment",
      colId: "name",
      cellRenderer: SegmentCell,
      minWidth: 340,
      flex: 2,
    },
    {
      headerName: "Customers",
      colId: "customersCount",
      field: "customersCount",
      cellRenderer: MemberCountCell,
      width: 135,
    },
    {
      headerName: "Type",
      field: "type",
      cellRenderer: SegmentTypeCell,
      width: 120,
      sortable: false,
    },
    {
      headerName: "Created",
      field: "createdAt",
      cellRenderer: DateCell,
      minWidth: 145,
    },
    {
      headerName: "Updated",
      field: "updatedAt",
      cellRenderer: DateCell,
      minWidth: 145,
    },
  ], []);

  const defaultColDef = useMemo<ColDef<ApiCustomerSegment>>(() => ({
    resizable: true,
    sortable: true,
    comparator: () => 0,
    cellStyle: { display: "flex", alignItems: "center" },
  }), []);

  return (
    <DataLayout
      fullWidth
      name="customer-segments"
      title="Segments"
      count={totalCount}
      actions={<Button icon={<PlusOutlined />} onClick={handleCreate}>Create segment</Button>}
    >
      <DataLayout.Toolbar
        left={<FilterWidget {...pageConfig.filterWidgetProps} searchPlaceholder="Search segments..." />}
      />

      <div style={{ height: "100%", paddingBottom: 16, display: "flex", flexDirection: "column" }}>
        {error ? <Alert type="error" message={error.message} showIcon style={{ marginBottom: 12 }} /> : null}

        <div style={{ flex: 1 }} data-testid="customer-segments-table">
          <AgGridReact<ApiCustomerSegment>
            ref={gridRef}
            theme={agGridTheme}
            rowData={segments}
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
          name="customer-segments"
          total={totalCount}
          rangeStart={pageConfig.getRangeStart(segments.length)}
          rangeEnd={Math.min(pageConfig.getRangeEnd(segments.length), totalCount)}
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
