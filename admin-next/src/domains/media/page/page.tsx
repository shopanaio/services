"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Image, Typography, Flex, Tag } from "antd";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
} from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { DataLayout } from "@/layouts/data";
import { useFilters, FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { useGridState, useGridSort, useAgGridTheme } from "@/hooks";
import { filterSchema } from "./filter-schema";
import { useFiles } from "../hooks";
import type { ApiFile } from "@/graphql/types";
import { FileProvider } from "@/graphql/types";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

// ============================================
// Cell Renderers
// ============================================

const FileCellRenderer = (props: CustomCellRendererProps<ApiFile>) => {
  const { data } = props;
  if (!data) return null;

  const isImage = data.mimeType?.startsWith("image/");

  return (
    <Flex align="center" gap="small">
      {isImage ? (
        <Image
          src={data.url}
          alt={data.originalName ?? "File"}
          width={40}
          height={40}
          style={{ borderRadius: 4, objectFit: "cover" }}
          preview={false}
        />
      ) : (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 4,
            backgroundColor: "#f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 500,
            color: "#666",
          }}
        >
          {data.ext?.toUpperCase() ?? "FILE"}
        </div>
      )}
      <Typography.Text strong ellipsis style={{ maxWidth: 200 }}>
        {data.originalName ?? "Untitled"}
      </Typography.Text>
    </Flex>
  );
};

const ProviderCellRenderer = (props: CustomCellRendererProps<ApiFile>) => {
  const { value } = props;
  const config: Record<string, { color: string; label: string }> = {
    [FileProvider.S3]: { color: "orange", label: "S3" },
    [FileProvider.Youtube]: { color: "red", label: "YouTube" },
    [FileProvider.Vimeo]: { color: "blue", label: "Vimeo" },
    [FileProvider.Url]: { color: "purple", label: "URL" },
    [FileProvider.Local]: { color: "default", label: "Local" },
  };
  const { color, label } = config[value] || config[FileProvider.Local];
  return <Tag color={color}>{label}</Tag>;
};

const SizeCellRenderer = (props: CustomCellRendererProps<ApiFile>) => {
  const { value } = props;
  if (!value || value === 0) {
    return <Typography.Text type="secondary">-</Typography.Text>;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return <Typography.Text>{formatBytes(value)}</Typography.Text>;
};

const DateCellRenderer = (props: CustomCellRendererProps<ApiFile>) => {
  const { value } = props;
  if (!value) return <Typography.Text type="secondary">-</Typography.Text>;

  const date = new Date(value);
  return (
    <Typography.Text>
      {date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}
    </Typography.Text>
  );
};

// ============================================
// Page Component
// ============================================

export default function MediaPage() {
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiFile>>(null);
  const [searchValue, setSearchValue] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const { widgetProps } = useFilters({ schema: filterSchema });

  const {
    files,
    totalCount,
    pageInfo,
    loading,
    fetchNextPage,
    fetchPreviousPage,
  } = useFiles({ first: pageSize });

  const { initialState, onStateUpdated } = useGridState({
    storageKey: "media-grid-state",
  });

  const { onSortChanged } = useGridSort({
    gridRef,
    onSortChange: (model) => {
      console.log("Sort changed:", model);
    },
  });

  const columnDefs = useMemo<ColDef<ApiFile>[]>(
    () => [
      {
        headerName: "File",
        field: "originalName",
        cellRenderer: FileCellRenderer,
        minWidth: 300,
        flex: 1,
      },
      {
        headerName: "Type",
        field: "mimeType",
        minWidth: 150,
      },
      {
        headerName: "Provider",
        field: "provider",
        cellRenderer: ProviderCellRenderer,
        minWidth: 100,
      },
      {
        headerName: "Size",
        field: "sizeBytes",
        cellRenderer: SizeCellRenderer,
        minWidth: 100,
      },
      {
        headerName: "Created",
        field: "createdAt",
        cellRenderer: DateCellRenderer,
        minWidth: 120,
        resizable: false,
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      comparator: () => 0,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    []
  );

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
  }, []);

  // Calculate pagination display
  const rangeStart = files.length > 0 ? 1 : 0;
  const rangeEnd = files.length;

  return (
    <DataLayout name="media" title="Media" count={totalCount}>
      <DataLayout.Toolbar
        left={
          <FilterWidget
            {...widgetProps}
            searchProps={{
              searchValue,
              onChangeSearchValue: setSearchValue,
            }}
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
        <div style={{ flex: 1 }}>
          <AgGridReact<ApiFile>
            ref={gridRef}
            theme={agGridTheme}
            rowData={files}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={52}
            loading={loading}
            rowSelection={{
              mode: "multiRow",
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: false,
            }}
            selectionColumnDef={{
              cellStyle: { display: "flex", alignItems: "center" },
            }}
            suppressCellFocus
            suppressMovableColumns
            rowStyle={{ cursor: "pointer" }}
            initialState={initialState}
            onStateUpdated={onStateUpdated}
            onSortChanged={onSortChanged}
          />
        </div>

        <CursorPagination
          total={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          pageSize={pageSize}
          hasNext={pageInfo?.hasNextPage ?? false}
          hasPrev={pageInfo?.hasPreviousPage ?? false}
          onNext={fetchNextPage}
          onPrev={fetchPreviousPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </DataLayout>
  );
}
