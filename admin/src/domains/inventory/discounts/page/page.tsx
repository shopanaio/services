"use client";

import { useCallback, useMemo, useRef } from "react";
import { Alert, Flex, Tag, Typography } from "antd";
import {
  AllCommunityModule,
  GridStateModule,
  ModuleRegistry,
  type ColDef,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { useAgGridTheme, usePageConfig } from "@/hooks";
import type { ApiDiscount, ApiDiscountWhereInput } from "@/graphql/types";
import {
  DiscountEffectiveStatus,
  DiscountOrderField,
} from "@/graphql/types";
import { useDiscounts } from "../hooks";
import { filterSchema } from "./filter-schema";
import {
  buildDiscountSearchCondition,
  buildDiscountsQueryVariables,
  discountFilterTransformers,
  discountSortFieldMapping,
} from "./page-config";

ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);

const statusColors: Record<DiscountEffectiveStatus, string> = {
  [DiscountEffectiveStatus.Draft]: "default",
  [DiscountEffectiveStatus.Scheduled]: "blue",
  [DiscountEffectiveStatus.Active]: "green",
  [DiscountEffectiveStatus.Paused]: "gold",
  [DiscountEffectiveStatus.Expired]: "red",
  [DiscountEffectiveStatus.Archived]: "default",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatEnum(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function DiscountCell({ data }: CustomCellRendererProps<ApiDiscount>) {
  if (!data) return null;

  return (
    <Flex vertical gap={2} style={{ minWidth: 0 }}>
      <Typography.Text strong ellipsis title={data.title ?? undefined}>
        {data.title ?? data.primaryCode ?? "Untitled discount"}
      </Typography.Text>
      {data.primaryCode && data.title && (
        <Typography.Text type="secondary" ellipsis title={data.primaryCode}>
          {data.primaryCode}
          {data.codesCount > 1 ? ` +${data.codesCount - 1}` : ""}
        </Typography.Text>
      )}
    </Flex>
  );
}

function StatusCell({
  value,
}: CustomCellRendererProps<ApiDiscount, DiscountEffectiveStatus>) {
  if (!value) return null;
  return <Tag color={statusColors[value]}>{formatEnum(value)}</Tag>;
}

function UsageCell({ data }: CustomCellRendererProps<ApiDiscount>) {
  if (!data) return null;
  const limit = data.usageLimit == null ? "Unlimited" : String(data.usageLimit);
  return (
    <Typography.Text>
      {String(data.usageCount)} / {limit}
    </Typography.Text>
  );
}

function ScheduleCell({ data }: CustomCellRendererProps<ApiDiscount>) {
  if (!data) return null;
  const start = dateFormatter.format(new Date(data.startsAt));
  const end = data.endsAt ? dateFormatter.format(new Date(data.endsAt)) : "No end";
  return <Typography.Text>{start} — {end}</Typography.Text>;
}

function DateCell({ value }: CustomCellRendererProps<ApiDiscount, string>) {
  return (
    <Typography.Text>
      {value ? dateFormatter.format(new Date(value)) : ""}
    </Typography.Text>
  );
}

export default function DiscountsPage() {
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiDiscount>>(null);
  const pageConfig = usePageConfig<
    ApiDiscount,
    ApiDiscountWhereInput,
    DiscountOrderField
  >({
    gridRef,
    storageKey: "discounts-grid-state",
    filterSchema,
    sortFieldMapping: discountSortFieldMapping,
    defaultSort: [{ colId: "updatedAt", sort: "desc" }],
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    buildSearchCondition: buildDiscountSearchCondition,
    filterTransformers: discountFilterTransformers,
  });
  const variables = useMemo(
    () => buildDiscountsQueryVariables(pageConfig),
    [
      pageConfig.first,
      pageConfig.after,
      pageConfig.last,
      pageConfig.before,
      pageConfig.where,
      pageConfig.orderBy,
    ],
  );
  const { discounts, totalCount, pageInfo, loading, error } =
    useDiscounts(variables);

  const handleNextPage = useCallback(() => {
    if (pageInfo?.endCursor) {
      pageConfig.goToNextPage(pageInfo.endCursor);
    }
  }, [pageConfig, pageInfo?.endCursor]);

  const handlePrevPage = useCallback(() => {
    if (pageInfo?.startCursor) {
      pageConfig.goToPrevPage(pageInfo.startCursor);
    }
  }, [pageConfig, pageInfo?.startCursor]);

  const columnDefs = useMemo<ColDef<ApiDiscount>[]>(
    () => [
      {
        headerName: "Discount",
        field: "title",
        cellRenderer: DiscountCell,
        minWidth: 280,
        flex: 2,
      },
      {
        headerName: "Method",
        field: "method",
        valueFormatter: ({ value }) => value ? formatEnum(value) : "",
        width: 125,
      },
      {
        headerName: "Type",
        field: "kind",
        valueFormatter: ({ value }) => value ? formatEnum(value) : "",
        minWidth: 190,
        flex: 1,
      },
      {
        headerName: "Status",
        field: "effectiveStatus",
        cellRenderer: StatusCell,
        width: 130,
      },
      {
        headerName: "Usage",
        colId: "usageCount",
        cellRenderer: UsageCell,
        width: 150,
      },
      {
        headerName: "Schedule",
        colId: "startsAt",
        cellRenderer: ScheduleCell,
        minWidth: 230,
      },
      {
        headerName: "Updated",
        field: "updatedAt",
        cellRenderer: DateCell,
        minWidth: 140,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef<ApiDiscount>>(
    () => ({
      resizable: true,
      sortable: true,
      comparator: () => 0,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    [],
  );

  return (
    <DataLayout fullWidth name="discounts" title="Discounts" count={totalCount}>
      <DataLayout.Toolbar
        left={
          <FilterWidget
            {...pageConfig.filterWidgetProps}
            searchPlaceholder="Search name or code..."
          />
        }
      />

      <div
        style={{
          height: "100%",
          paddingBottom: 16,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {error && (
          <Alert
            type="error"
            message={error.message}
            showIcon
            style={{ marginBottom: 12 }}
          />
        )}

        <div style={{ flex: 1 }} data-testid="discounts-table">
          <AgGridReact<ApiDiscount>
            ref={gridRef}
            theme={agGridTheme}
            rowData={discounts}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={64}
            suppressCellFocus
            suppressMovableColumns
            onSortChanged={pageConfig.onSortChanged}
            initialState={pageConfig.gridStateProps.initialState}
            onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
          />
        </div>

        <CursorPagination
          name="discounts"
          total={totalCount}
          rangeStart={pageConfig.getRangeStart(discounts.length)}
          rangeEnd={Math.min(
            pageConfig.getRangeEnd(discounts.length),
            totalCount,
          )}
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
