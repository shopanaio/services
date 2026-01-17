"use client";

import { useMemo, useRef, useCallback, useState, useEffect } from "react";
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
import { CloudUploadOutlined, DeleteOutlined, UndoOutlined } from "@ant-design/icons";
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import {
  FloatingPanelStack,
  usePanelOrder,
  type PanelConfig,
  type ActionConfig,
} from "@/ui-kit/floating-panel-stack";
import { usePageConfig, createStartsWithTransformer, useAgGridTheme, useAgGridRowSelection } from "@/hooks";
import { filterSchema } from "./filter-schema";
import { useFiles, FileOrderField } from "../hooks";
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

  // Media preview
  const mediaPreview = useMediaPreview(files);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionByState, setSelectionByState] = useState<{
    active: number;
    deleted: number;
  }>({ active: 0, deleted: 0 });

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

      // Count by state based on deletedAt field
      setSelectionByState({
        active: selectedRows.filter((r) => !r.deletedAt).length,
        deleted: selectedRows.filter((r) => !!r.deletedAt).length,
      });
    },
    []
  );

  // Deselect all rows
  const handleDeselectAll = useCallback(() => {
    gridRef.current?.api.deselectAll();
    setSelectedIds([]);
    setSelectionByState({ active: 0, deleted: 0 });
  }, []);

  // Delete selected files
  const handleDeleteSelected = useCallback(() => {
    const activeIds = selectedIds.filter((id) => {
      const file = files.find((f) => f.id === id);
      return file && !file.deletedAt;
    });
    // TODO: Implement delete mutation
    console.log("Delete files:", activeIds);
    handleDeselectAll();
  }, [selectedIds, files, handleDeselectAll]);

  // Restore selected files
  const handleRestoreSelected = useCallback(() => {
    const deletedIds = selectedIds.filter((id) => {
      const file = files.find((f) => f.id === id);
      return file && file.deletedAt;
    });
    // TODO: Implement restore mutation
    console.log("Restore files:", deletedIds);
    handleDeselectAll();
  }, [selectedIds, files, handleDeselectAll]);

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
        count: selectionByState.active,
        danger: true,
        onClick: handleDeleteSelected,
      },
      {
        key: "restore",
        label: "Restore",
        icon: <UndoOutlined />,
        count: selectionByState.deleted,
        onClick: handleRestoreSelected,
      },
    ],
    [selectionByState, handleDeleteSelected, handleRestoreSelected]
  );

  // Track panel activation order
  const { sortPanels, trackActivePanels } = usePanelOrder();

  const hasSelectionPanel = selectedIds.length > 0;

  // Auto-track panel activations
  useEffect(() => {
    trackActivePanels({
      hasEditing: false, // Media page doesn't have inline editing yet
      hasSelection: hasSelectionPanel,
    });
  }, [hasSelectionPanel, trackActivePanels]);

  // Build floating panels (sorted by activation order)
  const panels = useMemo<PanelConfig[]>(() => {
    const result: PanelConfig[] = [];

    if (hasSelectionPanel) {
      result.push({
        type: "selection",
        count: selectedIds.length,
        actions: selectionActions,
        onDeselectAll: handleDeselectAll,
      });
    }

    return sortPanels(result);
  }, [hasSelectionPanel, selectedIds.length, selectionActions, handleDeselectAll, sortPanels]);

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
