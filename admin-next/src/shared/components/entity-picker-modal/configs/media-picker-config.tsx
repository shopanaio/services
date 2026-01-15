"use client";

import { useState, useCallback } from "react";
import { Image, Typography, Flex, Tag } from "antd";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { registerEntityPickerConfig } from ".";
import type {
  IEntityPickerConfig,
  IEntityPickerDataResult,
  IPickableEntity,
} from "../types";
import type { IFilterValue } from "@/layouts/filters";
import { useFiles } from "@/domains/media/hooks";
import type { ApiFile } from "@/graphql/types";
import { FileProvider } from "@/graphql/types";

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
  provider: FileProvider;
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
    provider: file.provider,
  };
}

// ============================================
// Cell Renderers (same as media page)
// ============================================

const FileCellRenderer = (props: CustomCellRendererProps<IMediaPickerEntity>) => {
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

const ProviderCellRenderer = (props: CustomCellRendererProps<IMediaPickerEntity>) => {
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
    field: "originalName",
    cellRenderer: FileCellRenderer,
    minWidth: 300,
    flex: 1,
  },
  {
    headerName: "Type",
    field: "mimeType",
    width: 120,
  },
  {
    headerName: "Provider",
    field: "provider",
    cellRenderer: ProviderCellRenderer,
    width: 120,
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
