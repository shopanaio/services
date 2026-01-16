"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Image, Typography, Flex, Tag, Button } from "antd";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
  RowClickedEvent,
} from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { CloudUploadOutlined } from "@ant-design/icons";
import { DataLayout } from "@/layouts/data";
import {
  useFilters,
  FilterWidget,
  FilterOperator,
  type IFilterValue,
} from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { useGridState, useGridSort, type SortModel } from "@/hooks";
import { useAgGridTheme } from "@/hooks";
import { filterSchema } from "./filter-schema";
import { useFiles, SortDirection, FileOrderField } from "../hooks";
import { useUploadMediaModal } from "../modals";
import { MediaPreview, useMediaPreview } from "../components/media-preview";
import type { ApiFile, ApiFileWhereInput, ApiFileOrderByInput } from "@/graphql/types";
import { FileProvider } from "@/graphql/types";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

// ============================================
// Filter & Sort Conversion
// ============================================

/**
 * Map AG Grid column IDs to FileOrderField enum values.
 */
const columnToOrderField: Record<string, FileOrderField> = {
  originalName: FileOrderField.OriginalName,
  mimeType: FileOrderField.MimeType,
  provider: FileOrderField.Provider,
  sizeBytes: FileOrderField.SizeBytes,
  createdAt: FileOrderField.CreatedAt,
};

/**
 * Convert AG Grid sort model to GraphQL orderBy input.
 */
function convertSortModel(sortModel: SortModel[]): ApiFileOrderByInput[] | undefined {
  if (sortModel.length === 0) return undefined;

  return sortModel
    .map((sort) => {
      const field = columnToOrderField[sort.colId];
      if (!field) return null;
      return {
        field,
        direction: sort.sort === "asc" ? SortDirection.Asc : SortDirection.Desc,
      };
    })
    .filter((item): item is ApiFileOrderByInput => item !== null);
}

/**
 * Map filter operators to GraphQL filter operators.
 */
const operatorToGraphQL: Record<FilterOperator, string> = {
  [FilterOperator.Eq]: "_eq",
  [FilterOperator.NotEq]: "_neq",
  [FilterOperator.Gt]: "_gt",
  [FilterOperator.Gte]: "_gte",
  [FilterOperator.Lt]: "_lt",
  [FilterOperator.Lte]: "_lte",
  [FilterOperator.In]: "_in",
  [FilterOperator.NotIn]: "_notIn",
  [FilterOperator.Like]: "_contains",
  [FilterOperator.NotLike]: "_notContains",
  [FilterOperator.ILike]: "_containsi",
  [FilterOperator.NotILike]: "_notContainsi",
  [FilterOperator.Is]: "_is",
  [FilterOperator.IsNot]: "_isNot",
  [FilterOperator.Between]: "_between",
};

/**
 * Check if a filter value is empty and should be skipped.
 */
function isEmptyFilterValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/**
 * Convert filter values to GraphQL where input.
 */
function convertFilters(filters: IFilterValue[]): ApiFileWhereInput | undefined {
  if (filters.length === 0) return undefined;

  const conditions: ApiFileWhereInput[] = [];

  for (const filter of filters) {
    // Skip empty filter values
    if (isEmptyFilterValue(filter.value)) continue;

    const gqlOperator = operatorToGraphQL[filter.operator];

    // Special handling for mimeType - use startsWith for partial matching
    if (filter.payloadKey === "mimeType") {
      const values = Array.isArray(filter.value) ? filter.value : [filter.value];
      const nonEmptyValues = values.filter((v) => v !== null && v !== undefined && v !== "");
      if (nonEmptyValues.length === 0) continue;

      const mimeConditions = nonEmptyValues.map((v) => ({
        mimeType: { _startsWithi: String(v) },
      }));
      conditions.push(
        mimeConditions.length === 1
          ? mimeConditions[0]
          : { _or: mimeConditions }
      );
      continue;
    }

    // Handle date range (Between operator)
    if (filter.operator === FilterOperator.Between && Array.isArray(filter.value)) {
      const [start, end] = filter.value;
      if (!start && !end) continue;

      const dateCondition: Record<string, unknown> = {};
      if (start) dateCondition._gte = start;
      if (end) dateCondition._lte = end;

      conditions.push({
        [filter.payloadKey]: dateCondition,
      } as ApiFileWhereInput);
      continue;
    }

    conditions.push({
      [filter.payloadKey]: {
        [gqlOperator]: filter.value,
      },
    } as ApiFileWhereInput);
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { _and: conditions };
}

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
  const [sortModel, setSortModel] = useState<SortModel[]>([
    { colId: "createdAt", sort: "desc" },
  ]);

  const { widgetProps, filters } = useFilters({ schema: filterSchema });

  // Convert filters and sort to GraphQL format
  const orderBy = useMemo(() => convertSortModel(sortModel), [sortModel]);
  const where = useMemo(() => convertFilters(filters), [filters]);

  const {
    files,
    totalCount,
    pageInfo,
    rangeStart,
    rangeEnd,
    loading,
    fetchNextPage,
    fetchPreviousPage,
    refetch,
  } = useFiles({
    first: pageSize,
    search: searchValue,
    where,
    orderBy,
  });

  // Upload modal
  const { push: pushUploadModal } = useUploadMediaModal();

  // Media preview
  const mediaPreview = useMediaPreview(files);

  const { initialState, onStateUpdated } = useGridState({
    storageKey: "media-grid-state",
  });

  const { onSortChanged } = useGridSort({
    gridRef,
    sortModel,
    onSortChange: setSortModel,
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

  const handleUpload = useCallback(() => {
    pushUploadModal({
      accept: "image/*,video/*",
      maxSize: 10,
      maxFiles: 20,
      onUpload: async (files: ApiFile[]) => {
        console.log("Uploaded files:", files);
        refetch();
      },
    });
  }, [pushUploadModal, refetch]);

  const handleRowClicked = useCallback(
    (event: RowClickedEvent<ApiFile>) => {
      // Don't open preview if clicking on checkbox
      const target = event.event?.target as HTMLElement;
      if (target?.closest('[role="checkbox"]') || target?.closest('.ag-checkbox')) {
        return;
      }

      if (event.data) {
        mediaPreview.openById(event.data.id);
      }
    },
    [mediaPreview]
  );

  return (
    <DataLayout
      name="media"
      title="Media"
      count={totalCount}
      actions={
        <Button
          type="primary"
          icon={<CloudUploadOutlined />}
          onClick={handleUpload}
        >
          Upload
        </Button>
      }
    >
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
            onRowClicked={handleRowClicked}
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

      <MediaPreview
        items={files}
        visible={mediaPreview.visible}
        currentIndex={mediaPreview.currentIndex}
        onClose={mediaPreview.close}
        onIndexChange={mediaPreview.setCurrentIndex}
      />
    </DataLayout>
  );
}
