"use client";

import { useState, useCallback } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Image, Typography } from "antd";
import { registerEntityPickerConfig } from ".";
import type {
  IEntityPickerConfig,
  IEntityPickerDataResult,
  IPickableEntity,
} from "../types";
import type { IFilterValue } from "@/layouts/filters";
import { useFiles } from "@/domains/media/hooks";
import type { ApiFile } from "@/graphql/types";

/**
 * Media entity adapted for picker
 */
export interface IMediaPickerEntity extends IPickableEntity {
  url: string;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number;
  ext: string | null;
  createdAt: string;
}

/**
 * Transform file to picker entity
 */
function transformFile(file: ApiFile): IMediaPickerEntity {
  return {
    id: file.id,
    title: file.originalName || file.id,
    image: file.url,
    url: file.url,
    originalName: file.originalName ?? null,
    mimeType: file.mimeType ?? null,
    sizeBytes: Number(file.sizeBytes) || 0,
    ext: file.ext ?? null,
    createdAt: file.createdAt,
  };
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Media cell renderer
 */
function MediaCellRenderer(params: ICellRendererParams<IMediaPickerEntity>) {
  const data = params.data;
  if (!data) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Image
        src={data.url}
        alt={data.title}
        width={40}
        height={40}
        style={{ objectFit: "cover", borderRadius: 4 }}
        preview={false}
      />
      <div style={{ minWidth: 0 }}>
        <Typography.Text
          ellipsis
          style={{ display: "block", fontWeight: 500 }}
        >
          {data.originalName || data.id}
        </Typography.Text>
        {data.ext && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {data.ext.toUpperCase()}
          </Typography.Text>
        )}
      </div>
    </div>
  );
}

/**
 * Size cell renderer
 */
function SizeCellRenderer(params: ICellRendererParams<IMediaPickerEntity>) {
  const data = params.data;
  if (!data) return null;

  return (
    <Typography.Text type="secondary">
      {formatFileSize(data.sizeBytes)}
    </Typography.Text>
  );
}

/**
 * Data hook for media picker
 */
function useMediaPickerData(options: {
  filters: IFilterValue[];
  search: string;
  pageSize: number;
}): IEntityPickerDataResult<IMediaPickerEntity> {
  const { pageSize } = options;
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const { files, totalCount, pageInfo, loading } = useFiles({
    first: pageSize,
    after: cursor,
  });

  const transformedData = files.map(transformFile);

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

  const handlePageSizeChange = useCallback(() => {
    setCursor(null);
    setCursorStack([]);
  }, []);

  return {
    data: transformedData,
    isLoading: loading,
    error: null,
    pagination: {
      total: totalCount,
      pageSize,
      hasNext: pageInfo?.hasNextPage ?? false,
      hasPrev: cursorStack.length > 0,
      rangeStart: totalCount > 0 ? rangeStart : 0,
      rangeEnd,
    },
    onNext: handleNext,
    onPrev: handlePrev,
    onPageSizeChange: handlePageSizeChange,
  };
}

/**
 * Column definitions for media picker
 */
const mediaPickerColumns: ColDef<IMediaPickerEntity>[] = [
  {
    headerName: "File",
    field: "title",
    cellRenderer: MediaCellRenderer,
    flex: 1,
    minWidth: 250,
  },
  {
    headerName: "Size",
    field: "sizeBytes",
    cellRenderer: SizeCellRenderer,
    width: 100,
  },
];

/**
 * Media picker configuration
 */
export const mediaPickerConfig: IEntityPickerConfig<IMediaPickerEntity> = {
  entityType: "media",
  entityName: "File",
  entityNamePlural: "Files",
  filterSchema: [],
  columns: mediaPickerColumns,
  useData: useMediaPickerData as IEntityPickerConfig<IMediaPickerEntity>["useData"],
  getRowId: (entity) => entity.id,
};

// Register the configuration
registerEntityPickerConfig(mediaPickerConfig);
