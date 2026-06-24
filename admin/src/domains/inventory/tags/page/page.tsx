"use client";

import { useMemo, useRef, useCallback } from "react";
import {
  Alert,
  Button,
  Flex,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined, TagOutlined } from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  GridStateModule,
} from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import {
  useAgGridTheme,
  usePageConfig,
} from "@/hooks";
import type { ApiTag } from "@/graphql/types";
import { formatDetailDate } from "@/domains/inventory/utils/format-detail-date";
import { filterSchema } from "./filter-schema";
import {
  buildTagsQueryVariables,
  tagSortFieldMapping,
  type TagsOrderField,
  type TagsWhereInput,
} from "./page-config";
import { useTags } from "../hooks";
import { useCreateTagModal, useTagModal } from "../modals";

ModuleRegistry.registerModules([
  AllCommunityModule,
  GridStateModule,
]);

const TagCellRenderer = (props: CustomCellRendererProps<ApiTag>) => {
  const { data } = props;
  if (!data) return null;

  return (
    <Flex
      align="center"
      gap="small"
      data-testid={`tags-table-tag-cell-${data.handle}`}
    >
      <Tag icon={<TagOutlined />} color="processing">
        {data.name}
      </Tag>
      <Typography.Text type="secondary">#{data.handle}</Typography.Text>
    </Flex>
  );
};

const ProductsCountCellRenderer = (
  props: CustomCellRendererProps<ApiTag, number>,
) => {
  const value = props.value ?? 0;

  return (
    <Typography.Text
      data-testid={
        props.data
          ? `tags-table-products-cell-${props.data.handle}`
          : undefined
      }
    >
      {value} {value === 1 ? "product" : "products"}
    </Typography.Text>
  );
};

const DateCellRenderer = (props: CustomCellRendererProps<ApiTag, string>) => (
  <Typography.Text>{formatDetailDate(props.value)}</Typography.Text>
);

export default function TagsPage() {
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiTag>>(null);
  const pageConfig = usePageConfig<ApiTag, TagsWhereInput, TagsOrderField>({
    gridRef,
    storageKey: "tags-grid-state",
    filterSchema,
    sortFieldMapping: tagSortFieldMapping,
    defaultPageSize: 20,
  });
  const listQueryVariables = useMemo(
    () => buildTagsQueryVariables(pageConfig),
    [
      pageConfig.first,
      pageConfig.after,
      pageConfig.last,
      pageConfig.before,
    ],
  );
  const {
    tags,
    totalCount,
    pageInfo,
    loading,
    error,
    refetch,
  } = useTags(listQueryVariables);
  const { goToNextPage, goToPrevPage } = pageConfig;
  const { push: openTagModal } = useTagModal();
  const { push: openCreateTagModal } = useCreateTagModal();

  const handleOpenCreateTagModal = useCallback(() => {
    openCreateTagModal({
      onCreated: () => {
        void refetch();
      },
    });
  }, [openCreateTagModal, refetch]);

  const handleNextPage = useCallback(() => {
    if (pageInfo?.endCursor) {
      goToNextPage(pageInfo.endCursor);
    }
  }, [goToNextPage, pageInfo?.endCursor]);

  const handlePrevPage = useCallback(() => {
    if (pageInfo?.startCursor) {
      goToPrevPage(pageInfo.startCursor);
    }
  }, [goToPrevPage, pageInfo?.startCursor]);

  const visibleTags = useMemo(() => {
    const search = pageConfig.searchValue.trim().toLowerCase();

    if (!search) {
      return tags;
    }

    return tags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(search) ||
        tag.handle.toLowerCase().includes(search),
    );
  }, [pageConfig.searchValue, tags]);

  const columnDefs = useMemo<ColDef<ApiTag>[]>(
    () => [
      {
        headerName: "Tag",
        field: "name",
        cellRenderer: TagCellRenderer,
        flex: 1,
        minWidth: 260,
        sortable: false,
      },
      {
        headerName: "Products",
        field: "productsCount",
        cellRenderer: ProductsCountCellRenderer,
        minWidth: 130,
        sortable: false,
      },
      {
        headerName: "Created",
        field: "createdAt",
        cellRenderer: DateCellRenderer,
        minWidth: 140,
        sortable: false,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: false,
      comparator: () => 0,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    [],
  );

  return (
    <DataLayout
      name="tags"
      title="Tags"
      count={totalCount}
      actions={
        <Button
          data-testid="tags-create-button"
          icon={<PlusOutlined />}
          onClick={handleOpenCreateTagModal}
        >
          Create
        </Button>
      }
    >
      <DataLayout.Toolbar
        left={
          <FilterWidget
            {...pageConfig.filterWidgetProps}
            searchPlaceholder="Search tags..."
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
        {error && (
          <Alert
            type="error"
            message={error.message}
            showIcon
            style={{ marginBottom: 12 }}
          />
        )}

        <div style={{ flex: 1 }} data-testid="tags-table">
          <AgGridReact<ApiTag>
            ref={gridRef}
            theme={agGridTheme}
            rowData={visibleTags}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={52}
            onRowClicked={(event) => {
              if (event.data) {
                openTagModal({ entityId: event.data.id });
              }
            }}
            suppressCellFocus
            suppressMovableColumns
            initialState={pageConfig.gridStateProps.initialState}
            onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
          />
        </div>

        <CursorPagination
          name="tags"
          total={totalCount}
          rangeStart={pageConfig.getRangeStart(tags.length)}
          rangeEnd={Math.min(pageConfig.getRangeEnd(tags.length), totalCount)}
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
