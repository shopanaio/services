"use client";

import { useCallback, useMemo, useRef } from "react";
import { Alert, Button, Flex, Tag, Typography } from "antd";
import { LuPlus as PlusOutlined } from "react-icons/lu";
import { AgGridReact } from "ag-grid-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import {
  AllCommunityModule,
  GridStateModule,
  ModuleRegistry,
  type ColDef,
} from "ag-grid-community";
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { useAgGridTheme, usePageConfig } from "@/hooks";
import type {
  ApiReviewContentExternalReference,
  ApiReviewContentExternalReferenceWhereInput,
} from "@/graphql/types";
import {
  ReviewContentExternalReferenceOrderField,
  ReviewExternalSyncStatus,
} from "@/graphql/types";
import { useUgcNavigation } from "@/domains/customer-content/use-ugc-navigation";
import { useExternalReferenceModal } from "../modals";
import { useExternalReferences } from "../hooks";
import { filterSchema } from "./filter-schema";
import {
  buildExternalReferenceSearchCondition,
  buildExternalReferencesQueryVariables,
  externalReferenceSortFieldMapping,
} from "./page-config";

ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function ReferenceCell({ data }: CustomCellRendererProps<ApiReviewContentExternalReference>) {
  if (!data) return null;
  return (
    <Flex vertical gap={2} style={{ minWidth: 0 }}>
      <Typography.Text strong ellipsis>
        {data.externalSystem} · {data.externalType}
      </Typography.Text>
      <Typography.Text copyable ellipsis>
        {data.externalId}
      </Typography.Text>
    </Flex>
  );
}
function ContentCell({ data }: CustomCellRendererProps<ApiReviewContentExternalReference>) {
  if (!data) return null;
  return (
    <Flex vertical gap={2} style={{ minWidth: 0 }}>
      <Typography.Text ellipsis title={data.content.body}>
        {data.content.body}
      </Typography.Text>
      <Typography.Text type="secondary" ellipsis>
        {data.content.author.displayName}
      </Typography.Text>
    </Flex>
  );
}

export default function ExternalReferencesPage() {
  const { backToUgc } = useUgcNavigation();
  const theme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiReviewContentExternalReference>>(null);
  const pageConfig = usePageConfig<
    ApiReviewContentExternalReference,
    ApiReviewContentExternalReferenceWhereInput,
    ReviewContentExternalReferenceOrderField
  >({
    gridRef,
    storageKey: "external-references-grid-state",
    filterSchema,
    sortFieldMapping: externalReferenceSortFieldMapping,
    defaultSort: [{ colId: "updatedAt", sort: "desc" }],
    defaultPageSize: 10,
    pageSizeOptions: [10, 20, 50],
    buildSearchCondition: buildExternalReferenceSearchCondition,
  });
  const variables = useMemo(
    () => buildExternalReferencesQueryVariables(pageConfig),
    [
      pageConfig.first,
      pageConfig.after,
      pageConfig.last,
      pageConfig.before,
      pageConfig.where,
      pageConfig.orderBy,
    ],
  );
  const { externalReferences, totalCount, pageInfo, loading, error, refetch } =
    useExternalReferences(variables);
  const { push } = useExternalReferenceModal();
  const next = useCallback(() => {
    if (pageInfo?.endCursor) pageConfig.goToNextPage(pageInfo.endCursor);
  }, [pageConfig, pageInfo?.endCursor]);
  const prev = useCallback(() => {
    if (pageInfo?.startCursor) pageConfig.goToPrevPage(pageInfo.startCursor);
  }, [pageConfig, pageInfo?.startCursor]);
  const columnDefs = useMemo<ColDef<ApiReviewContentExternalReference>[]>(
    () => [
      {
        headerName: "Reference",
        colId: "externalSystem",
        cellRenderer: ReferenceCell,
        minWidth: 240,
        flex: 1,
      },
      {
        headerName: "Content",
        colId: "content",
        cellRenderer: ContentCell,
        minWidth: 320,
        flex: 2,
        sortable: false,
      },
      { headerName: "Type", field: "externalType", minWidth: 140 },
      {
        headerName: "Direction",
        field: "direction",
        width: 145,
        valueFormatter: ({ value }) => String(value).toLowerCase(),
      },
      {
        headerName: "Status",
        field: "syncStatus",
        width: 125,
        cellRenderer: ({
          value,
        }: CustomCellRendererProps<
          ApiReviewContentExternalReference,
          ReviewExternalSyncStatus
        >) => (
          <Tag
            color={
              value === ReviewExternalSyncStatus.Synced
                ? "green"
                : value === ReviewExternalSyncStatus.Failed
                  ? "red"
                  : value === ReviewExternalSyncStatus.Pending
                    ? "gold"
                    : undefined
            }
          >
            {String(value).toLowerCase()}
          </Tag>
        ),
      },
      {
        headerName: "Last sync",
        field: "lastSyncedAt",
        minWidth: 180,
        cellRenderer: ({
          value,
        }: CustomCellRendererProps<ApiReviewContentExternalReference, string>) => (
          <Typography.Text>
            {value ? dateFormatter.format(new Date(value)) : "Never"}
          </Typography.Text>
        ),
      },
      {
        headerName: "Updated",
        field: "updatedAt",
        minWidth: 180,
        cellRenderer: ({
          value,
        }: CustomCellRendererProps<ApiReviewContentExternalReference, string>) => (
          <Typography.Text>{value ? dateFormatter.format(new Date(value)) : ""}</Typography.Text>
        ),
      },
    ],
    [],
  );
  const defaultColDef = useMemo<ColDef<ApiReviewContentExternalReference>>(
    () => ({
      resizable: true,
      sortable: true,
      comparator: () => 0,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    [],
  );

  return (
    <DataLayout
      fullWidth
      name="external-references"
      title="External sync"
      count={totalCount}
      onBack={backToUgc}
      actions={
        <Button icon={<PlusOutlined />} onClick={() => push({ onSaved: refetch })}>
          Add reference
        </Button>
      }
    >
      <DataLayout.Toolbar
        left={
          <FilterWidget
            {...pageConfig.filterWidgetProps}
            searchPlaceholder="Search external references..."
          />
        }
      />
      <div style={{ height: "100%", paddingBottom: 16, display: "flex", flexDirection: "column" }}>
        {error ? (
          <Alert type="error" showIcon message={error.message} style={{ marginBottom: 12 }} />
        ) : null}
        <div style={{ flex: 1 }} data-testid="external-references-table">
          <AgGridReact<ApiReviewContentExternalReference>
            ref={gridRef}
            theme={theme}
            rowData={externalReferences}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={({ data }) => data.id}
            rowHeight={68}
            suppressCellFocus
            suppressMovableColumns
            rowStyle={{ cursor: "pointer" }}
            onRowClicked={({ data }) => data && push({ externalReference: data, onSaved: refetch })}
            onSortChanged={pageConfig.onSortChanged}
            initialState={pageConfig.gridStateProps.initialState}
            onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
          />
        </div>
        <CursorPagination
          name="external references"
          total={totalCount}
          rangeStart={pageConfig.getRangeStart(externalReferences.length)}
          rangeEnd={Math.min(pageConfig.getRangeEnd(externalReferences.length), totalCount)}
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
