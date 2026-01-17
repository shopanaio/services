"use client";

import { useMemo, useRef, useCallback, useState } from "react";
import { Image, Typography, Flex, Tag, Button } from "antd";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
  SelectionChangedEvent,
} from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { CloudUploadOutlined, DeleteOutlined } from "@ant-design/icons";
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import {
  FloatingPanelStack,
  type PanelConfig,
  type ActionConfig,
} from "@/ui-kit/floating-panel-stack";
import { usePageConfig, createStartsWithTransformer, useAgGridTheme, useAgGridRowSelection } from "@/hooks";
import { filterSchema } from "./filter-schema";
import { useFiles, useDeleteFiles, FileOrderField } from "../hooks";
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
// Sort Field Mapping
// ============================================

const sortFieldMapping: Record<string, FileOrderField> = {
  originalName: FileOrderField.OriginalName,
  mimeType: FileOrderField.MimeType,
  provider: FileOrderField.Provider,
  sizeBytes: FileOrderField.SizeBytes,
  createdAt: FileOrderField.CreatedAt,
};

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

  // Universal page config hook
  const {
    searchValue,
    pageSize,
    pageSizeOptions,
    where,
    orderBy,
    first,
    last,
    after,
    before,
    filterWidgetProps,
    gridStateProps,
    onSortChanged,
    setPageSize,
    goToNextPage,
    goToPrevPage,
    getRangeStart,
    getRangeEnd,
  } = usePageConfig<ApiFile, ApiFileWhereInput, FileOrderField>({
    gridRef,
    storageKey: "media-grid-state",
    filterSchema,
    sortFieldMapping,
    defaultSort: [{ colId: "createdAt", sort: "desc" }],
    defaultPageSize: 20,
    searchField: "originalName",
    filterTransformers: {
      mimeType: createStartsWithTransformer<ApiFileWhereInput>("mimeType"),
    },
  });

  const {
    files,
    totalCount,
    pageInfo,
    loading,
    refetch,
  } = useFiles({
    first,
    last,
    after,
    before,
    search: searchValue,
    where,
    orderBy: orderBy as ApiFileOrderByInput[] | undefined,
  });

  // Pagination handlers
  const handleNextPage = useCallback(() => {
    if (pageInfo?.endCursor) {
      goToNextPage(pageInfo.endCursor);
    }
  }, [pageInfo?.endCursor, goToNextPage]);

  const handlePrevPage = useCallback(() => {
    if (pageInfo?.startCursor) {
      goToPrevPage(pageInfo.startCursor);
    }
  }, [pageInfo?.startCursor, goToPrevPage]);

  // Upload modal
  const { push: pushUploadModal } = useUploadMediaModal();

  // Delete hook
  const { deleteFiles, loading: deleteLoading } = useDeleteFiles();

  // Media preview
  const mediaPreview = useMediaPreview(files);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeSelectionCount, setActiveSelectionCount] = useState(0);

  // Row selection with checkbox isolation
  const { rowSelection, selectionColumnDef, onCellClicked } = useAgGridRowSelection<ApiFile>({
    onRowAction: (data) => mediaPreview.openById(data.id),
  });

  // Handle selection changes
  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<ApiFile>) => {
      const selectedRows = event.api.getSelectedRows();
      const ids = selectedRows.map((row) => row.id);
      setSelectedIds(ids);
      setActiveSelectionCount(selectedRows.filter((r) => !r.deletedAt).length);
    },
    []
  );

  // Deselect all rows
  const deselectAll = useCallback(() => {
    gridRef.current?.api.deselectAll();
    setSelectedIds([]);
    setActiveSelectionCount(0);
  }, []);

  // Delete selected files
  const handleDeleteSelected = useCallback(async () => {
    const activeIds = selectedIds.filter((id) => {
      const file = files.find((f) => f.id === id);
      return file && !file.deletedAt;
    });
    if (activeIds.length === 0) return;

    await deleteFiles(activeIds);
    deselectAll();
    refetch();
  }, [selectedIds, files, deselectAll, deleteFiles, refetch]);

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

  // Build selection actions with counts
  const selectionActions = useMemo<ActionConfig[]>(
    () => [
      {
        key: "delete",
        label: "Delete",
        icon: <DeleteOutlined />,
        count: activeSelectionCount,
        danger: true,
        loading: deleteLoading,
        onClick: handleDeleteSelected,
      },
    ],
    [activeSelectionCount, handleDeleteSelected, deleteLoading]
  );

  // Build floating panels
  const panels = useMemo<PanelConfig[]>(() => {
    const result: PanelConfig[] = [];

    if (selectedIds.length > 0) {
      // eslint-disable-next-line react-hooks/refs -- deselectAll is called on click, not during render
      result.push({
        type: "selection",
        count: selectedIds.length,
        actions: selectionActions,
        onDeselectAll: deselectAll,
      });
    }

    return result;
  }, [selectedIds.length, selectionActions, deselectAll]);

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
        left={<FilterWidget {...filterWidgetProps} />}
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
            rowSelection={rowSelection}
            selectionColumnDef={selectionColumnDef}
            suppressCellFocus
            suppressMovableColumns
            rowStyle={{ cursor: "pointer" }}
            {...gridStateProps}
            onSortChanged={onSortChanged}
            onCellClicked={onCellClicked}
            onSelectionChanged={handleSelectionChanged}
          />
        </div>

        <CursorPagination
          total={totalCount}
          rangeStart={getRangeStart(files.length)}
          rangeEnd={getRangeEnd(files.length)}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          hasNext={pageInfo?.hasNextPage ?? false}
          hasPrev={pageInfo?.hasPreviousPage ?? false}
          onNext={handleNextPage}
          onPrev={handlePrevPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <MediaPreview
        items={files}
        visible={mediaPreview.visible}
        currentIndex={mediaPreview.currentIndex}
        onClose={mediaPreview.close}
        onIndexChange={mediaPreview.setCurrentIndex}
      />

      <FloatingPanelStack panels={panels} />
    </DataLayout>
  );
}
