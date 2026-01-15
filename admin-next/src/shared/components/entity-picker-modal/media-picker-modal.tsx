"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  RowSelectionModule,
  SelectionChangedEvent,
} from "ag-grid-community";
import { Upload, Typography, Flex, message, Progress } from "antd";
import { CloudUploadOutlined } from "@ant-design/icons";
import { ModalLayout, ModalHeader, useModalStackContext } from "@/layouts/modals";
import { useFilters, FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { useAgGridTheme } from "@/hooks";
import { useFiles, useUploadFiles } from "@/domains/media/hooks";
import { useMediaPickerStyles } from "./media-picker-modal.styles";
import { mediaPickerConfig, type IMediaPickerEntity } from "./configs/media-picker-config";
import type { ApiFile } from "@/graphql/types";

const { Dragger } = Upload;

ModuleRegistry.registerModules([AllCommunityModule, RowSelectionModule]);

// ============================================
// Types
// ============================================

export interface IMediaPickerPayload {
  selectionMode?: "single" | "multi";
  initialSelection?: string[];
  excludeIds?: string[];
  maxSelection?: number;
  accept?: string;
  maxSize?: number;
  onConfirm: (files: ApiFile[]) => void;
}

// ============================================
// Component
// ============================================

export function MediaPickerModal() {
  const { styles } = useMediaPickerStyles();
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<IMediaPickerEntity>>(null);
  const { payload, forcePop } = useModalStackContext();
  const typedPayload = payload as unknown as IMediaPickerPayload;

  const {
    selectionMode = "multi",
    initialSelection = [],
    excludeIds = [],
    accept = "image/*",
    maxSize = 10,
    onConfirm,
  } = typedPayload;

  // Upload state
  const { uploadFiles, loading: uploading, progress } = useUploadFiles();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection);
  const [selectedEntities, setSelectedEntities] = useState<IMediaPickerEntity[]>([]);
  const [isGridReady, setIsGridReady] = useState(false);

  // Filter state
  const { widgetProps, filters } = useFilters({
    schema: mediaPickerConfig.filterSchema,
  });

  // Pagination state
  const [searchValue, setSearchValue] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  // Data fetching
  const { files, totalCount, pageInfo, loading, refetch } = useFiles({
    first: pageSize,
    after: cursor,
  });

  // Transform files to picker entities
  const transformedData = useMemo(() => {
    const transformed = files.map((file): IMediaPickerEntity => ({
      id: file.id,
      title: file.originalName || file.id,
      image: file.url,
      url: file.url,
      originalName: file.originalName ?? null,
      mimeType: file.mimeType ?? null,
      sizeBytes: Number(file.sizeBytes) || 0,
      ext: file.ext ?? null,
      createdAt: file.createdAt,
    }));

    // Filter out excluded IDs
    if (excludeIds.length > 0) {
      return transformed.filter((item) => !excludeIds.includes(item.id));
    }

    return transformed;
  }, [files, excludeIds]);

  // Pagination calculations
  const rangeStart = cursorStack.length * pageSize + 1;
  const rangeEnd = Math.min(rangeStart + files.length - 1, totalCount);

  const handleNext = useCallback(() => {
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      setCursorStack((prev) => [...prev, cursor || ""]);
      setCursor(pageInfo.endCursor);
    }
  }, [pageInfo, cursor]);

  const handlePrev = useCallback(() => {
    if (cursorStack.length > 0) {
      const newStack = [...cursorStack];
      const prevCursor = newStack.pop();
      setCursorStack(newStack);
      setCursor(prevCursor || null);
    }
  }, [cursorStack]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCursor(null);
    setCursorStack([]);
  }, []);

  // Selection handling
  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<IMediaPickerEntity>) => {
      const selectedRows = event.api.getSelectedRows();
      const ids = selectedRows.map((row) => mediaPickerConfig.getRowId(row));
      setSelectedIds(ids);
      setSelectedEntities(selectedRows);
    },
    []
  );

  // Set initial selection when grid is ready
  useEffect(() => {
    if (!isGridReady || !initialSelection.length) return;

    const api = gridRef.current?.api;
    if (!api) return;

    api.forEachNode((node) => {
      if (node.data && initialSelection.includes(mediaPickerConfig.getRowId(node.data))) {
        node.setSelected(true);
      }
    });
  }, [isGridReady, initialSelection]);

  const handleGridReady = useCallback(() => {
    setIsGridReady(true);
  }, []);

  // File upload handling
  const handleBeforeUpload = useCallback(
    async (file: File, fileList: File[]) => {
      // Process all files only once (when we hit the last file)
      if (file === fileList[fileList.length - 1]) {
        // Validate size
        const validFiles: File[] = [];
        for (const f of fileList) {
          if (f.size / 1024 / 1024 > maxSize) {
            message.error(`${f.name} exceeds ${maxSize}MB limit`);
            continue;
          }
          validFiles.push(f);
        }

        if (validFiles.length === 0) return false;

        try {
          const { files: uploadedFiles, userErrors } = await uploadFiles(validFiles);

          if (userErrors.length > 0) {
            message.error(userErrors[0].message);
          }

          if (uploadedFiles.length > 0) {
            message.success(`Uploaded ${uploadedFiles.length} file(s)`);
            // Reset pagination to first page and refetch
            setCursor(null);
            setCursorStack([]);
            refetch();
          }
        } catch {
          message.error("Upload failed");
        }
      }
      return false;
    },
    [maxSize, uploadFiles, refetch]
  );

  // Confirm handler
  const handleConfirm = useCallback(() => {
    // Find selected files from original data
    const selectedFiles = files.filter((file) => selectedIds.includes(file.id));
    onConfirm(selectedFiles);
    forcePop();
  }, [files, selectedIds, onConfirm, forcePop]);

  const handleCancel = useCallback(() => {
    forcePop();
  }, [forcePop]);

  const confirmText =
    selectedIds.length > 0 ? `Select (${selectedIds.length})` : "Select";

  return (
    <ModalLayout
      fullWidth
      name="media-picker"
      bodyClassName="media-picker-body"
      header={
        <ModalHeader
          title="Select Files"
          onClose={handleCancel}
          submitButtonProps={{
            onClick: handleConfirm,
            disabled: selectedIds.length === 0,
            children: confirmText,
          }}
        />
      }
    >
      <div className={styles.container}>
        {/* Toolbar with filters */}
        <div className={styles.toolbar}>
          <FilterWidget
            {...widgetProps}
            searchProps={{
              searchValue,
              onChangeSearchValue: setSearchValue,
            }}
            searchPlaceholder="Search files..."
          />
        </div>

        {/* Upload Dragger */}
        <div className={styles.draggerSection}>
          <Dragger
            className={styles.dragger}
            multiple
            accept={accept}
            beforeUpload={handleBeforeUpload}
            showUploadList={false}
            disabled={uploading}
          >
            {uploading ? (
              <div style={{ padding: "8px 0" }}>
                <Progress percent={progress} status="active" style={{ width: 200 }} />
                <Typography.Text type="secondary" style={{ marginTop: 8, display: "block" }}>
                  Uploading...
                </Typography.Text>
              </div>
            ) : (
              <Flex align="center" justify="center" vertical>
                <CloudUploadOutlined className={styles.draggerIcon} />
                <Typography.Text className={styles.draggerTitle}>
                  Upload images
                </Typography.Text>
                <Typography.Text className={styles.draggerHint}>
                  Drag and drop files here or{" "}
                  <span className={styles.browseLink}>browse</span>
                </Typography.Text>
              </Flex>
            )}
          </Dragger>
        </div>

        {/* AG Grid */}
        <div className={styles.gridContainer}>
          <AgGridReact<IMediaPickerEntity>
            ref={gridRef}
            theme={agGridTheme}
            rowData={transformedData}
            columnDefs={mediaPickerConfig.columns}
            getRowId={(params) => mediaPickerConfig.getRowId(params.data)}
            rowHeight={52}
            headerHeight={40}
            rowSelection={{
              mode: selectionMode === "single" ? "singleRow" : "multiRow",
              checkboxes: true,
              headerCheckbox: selectionMode === "multi",
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }}
            selectionColumnDef={{
              cellStyle: { display: "flex", alignItems: "center" },
            }}
            suppressCellFocus
            suppressMovableColumns
            onSelectionChanged={handleSelectionChanged}
            onGridReady={handleGridReady}
            rowStyle={{ cursor: "pointer" }}
            loading={loading}
            defaultColDef={{
              resizable: false,
              sortable: false,
              cellStyle: { display: "flex", alignItems: "center" },
            }}
          />
        </div>

        {/* Pagination */}
        <div className={styles.pagination}>
          <CursorPagination
            total={totalCount}
            rangeStart={totalCount > 0 ? rangeStart : 0}
            rangeEnd={rangeEnd}
            pageSize={pageSize}
            hasNext={pageInfo?.hasNextPage ?? false}
            hasPrev={cursorStack.length > 0}
            onNext={handleNext}
            onPrev={handlePrev}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </div>
    </ModalLayout>
  );
}
