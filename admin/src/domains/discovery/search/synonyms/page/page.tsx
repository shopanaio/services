"use client";

import { useCallback, useMemo, useRef } from "react";
import { Alert, Flex, Tag, Typography } from "antd";
import { AgGridReact } from "ag-grid-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import {
  AllCommunityModule,
  type ColDef,
  GridStateModule,
  ModuleRegistry,
} from "ag-grid-community";
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { useAgGridTheme, usePageConfig } from "@/hooks";
import type {
  ApiSearchSynonymGroup,
  ApiSearchSynonymGroupWhereInput,
} from "@/graphql/types";
import { SearchSynonymGroupOrderField } from "@/graphql/types";
import { useSynonymGroups } from "../hooks";
import { filterSchema } from "./filter-schema";
import {
  buildSynonymGroupSearchCondition,
  buildSynonymGroupsQueryVariables,
  synonymGroupFilterTransformers,
  synonymGroupSortFieldMapping,
} from "./page-config";

ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

const NameCellRenderer = (
  props: CustomCellRendererProps<ApiSearchSynonymGroup, string>,
) => (
  <Typography.Text
    strong
    ellipsis={{ tooltip: props.value }}
    style={{ maxWidth: "100%" }}
  >
    {props.value}
  </Typography.Text>
);

const ValuesCellRenderer = (
  props: CustomCellRendererProps<ApiSearchSynonymGroup, number>,
) => {
  const values = [...(props.data?.values ?? [])]
    .sort((left, right) => left.position - right.position)
    .map(({ value }) => value)
    .join(" ↔ ");

  return (
    <Flex align="center" gap={8} style={{ minWidth: 0, width: "100%" }}>
      <Tag style={{ marginInlineEnd: 0 }}>{props.value ?? 0}</Tag>
      <Typography.Text
        type={values ? undefined : "secondary"}
        ellipsis={{ tooltip: values || undefined }}
        style={{ minWidth: 0 }}
      >
        {values || "No synonym values"}
      </Typography.Text>
    </Flex>
  );
};

const LocaleCellRenderer = (
  props: CustomCellRendererProps<ApiSearchSynonymGroup, string>,
) => <Tag style={{ marginInlineEnd: 0 }}>{props.value?.toUpperCase()}</Tag>;

const StatusCellRenderer = (
  props: CustomCellRendererProps<ApiSearchSynonymGroup, boolean>,
) => (
  <Tag color={props.value ? "success" : "default"}>
    {props.value ? "Enabled" : "Disabled"}
  </Tag>
);

const DateCellRenderer = (
  props: CustomCellRendererProps<ApiSearchSynonymGroup, string>,
) => <Typography.Text>{formatDate(props.value)}</Typography.Text>;

export default function SynonymsPage() {
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiSearchSynonymGroup>>(null);
  const pageConfig = usePageConfig<
    ApiSearchSynonymGroup,
    ApiSearchSynonymGroupWhereInput,
    SearchSynonymGroupOrderField
  >({
    gridRef,
    storageKey: "search-synonyms-grid-state",
    filterSchema,
    sortFieldMapping: synonymGroupSortFieldMapping,
    defaultPageSize: 20,
    buildSearchCondition: buildSynonymGroupSearchCondition,
    filterTransformers: synonymGroupFilterTransformers,
  });

  const queryVariables = useMemo(
    () => buildSynonymGroupsQueryVariables(pageConfig),
    [
      pageConfig.first,
      pageConfig.after,
      pageConfig.last,
      pageConfig.before,
      pageConfig.where,
      pageConfig.orderBy,
    ],
  );
  const { synonymGroups, totalCount, pageInfo, loading, error } =
    useSynonymGroups(queryVariables);

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

  const columnDefs = useMemo<ColDef<ApiSearchSynonymGroup>[]>(
    () => [
      {
        headerName: "Group",
        field: "name",
        cellRenderer: NameCellRenderer,
        flex: 1,
        minWidth: 240,
      },
      {
        headerName: "Synonyms",
        field: "valuesCount",
        cellRenderer: ValuesCellRenderer,
        flex: 2,
        minWidth: 360,
      },
      {
        headerName: "Locale",
        field: "locale",
        cellRenderer: LocaleCellRenderer,
        minWidth: 100,
        maxWidth: 130,
      },
      {
        headerName: "Status",
        field: "enabled",
        cellRenderer: StatusCellRenderer,
        minWidth: 120,
        maxWidth: 140,
      },
      {
        headerName: "Updated",
        field: "updatedAt",
        cellRenderer: DateCellRenderer,
        minWidth: 150,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef<ApiSearchSynonymGroup>>(
    () => ({
      resizable: true,
      sortable: true,
      comparator: () => 0,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    [],
  );

  return (
    <DataLayout name="synonyms" title="Synonyms" count={totalCount}>
      <DataLayout.Toolbar
        left={
          <FilterWidget
            {...pageConfig.filterWidgetProps}
            searchPlaceholder="Search synonym groups by name..."
          />
        }
      />

      <div
        style={{
          height: "100%",
          paddingBottom: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {error ? <Alert type="error" message={error.message} showIcon /> : null}

        <div
          style={{ flex: 1, minHeight: 0 }}
          data-testid="synonyms-table"
        >
          <AgGridReact<ApiSearchSynonymGroup>
            ref={gridRef}
            theme={agGridTheme}
            rowData={synonymGroups}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={56}
            suppressCellFocus
            suppressMovableColumns
            onSortChanged={pageConfig.onSortChanged}
            initialState={pageConfig.gridStateProps.initialState}
            onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
          />
        </div>

        <CursorPagination
          name="synonyms"
          total={totalCount}
          rangeStart={pageConfig.getRangeStart(synonymGroups.length)}
          rangeEnd={Math.min(
            pageConfig.getRangeEnd(synonymGroups.length),
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
