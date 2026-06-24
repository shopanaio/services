"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  Alert,
  Button,
  Flex,
  Tag,
  Typography,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  FolderOutlined,
} from "@ant-design/icons";
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
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { FloatingPanelStack } from "@/ui-kit/floating-panel-stack";
import type { ActionConfig } from "@/ui-kit/floating-panel-stack/core/types";
import type { PanelConfig } from "@/ui-kit/floating-panel-stack/data-page/floating-panel-stack";
import {
  useAgGridTheme,
  useAgGridRowSelection,
  usePageConfig,
} from "@/hooks";
import type {
  ApiCategory,
  ApiCategoryWhereInput,
  ApiFile,
} from "@/graphql/types";
import { CategoryOrderField } from "@/graphql/types";
import { formatDetailDate } from "@/domains/inventory/utils/format-detail-date";
import { filterSchema } from "./filter-schema";
import {
  buildCategoriesQueryVariables,
  buildCategorySearchCondition,
  categoryFilterTransformers,
  categorySortFieldMapping,
} from "./page-config";
import { useCategories } from "../hooks";
import { useCategoryModal, useCreateCategoryModal } from "../modals";
import type { CategoriesQueryVariables } from "../graphql/operation-types";
import { TableCoverImage } from "@/shared/components/table-cover-image";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

function getCategoryThumbnailFile(category: ApiCategory): ApiFile | null {
  const [thumbnail] = [...category.media].sort(
    (a, b) => a.sortIndex - b.sortIndex,
  );

  return thumbnail?.file ?? null;
}

const CategoryCellRenderer = (
  props: CustomCellRendererProps<ApiCategory>,
) => {
  const { data } = props;
  if (!data) return null;

  const thumbnail = getCategoryThumbnailFile(data);

  return (
    <Flex
      align="center"
      gap="small"
      data-testid={`categories-table-category-cell-${data.handle}`}
    >
      <TableCoverImage
        src={thumbnail?.url ?? null}
        alt={thumbnail?.altText ?? thumbnail?.originalName ?? data.name}
        fallbackIcon={<FolderOutlined />}
      />
      <Flex vertical gap={0}>
        <Typography.Text
          strong
          data-testid={`categories-table-name-cell-${data.handle}`}
        >
          {data.name}
        </Typography.Text>
        <Typography.Text
          type="secondary"
          data-testid={`categories-table-handle-cell-${data.handle}`}
        >
          {data.handle}
        </Typography.Text>
      </Flex>
    </Flex>
  );
};

const StatusCellRenderer = (
  props: CustomCellRendererProps<ApiCategory, boolean>,
) => {
  const isPublished = props.value ?? props.data?.isPublished ?? false;
  const color = isPublished ? "success" : "default";
  const label = isPublished ? "Published" : "Draft";

  return (
    <Tag
      color={color}
      data-testid={
        props.data
          ? `categories-table-status-cell-${props.data.handle}`
          : undefined
      }
    >
      {label}
    </Tag>
  );
};

const ProductsCountCellRenderer = (
  props: CustomCellRendererProps<ApiCategory, number>,
) => {
  const value = props.value ?? 0;

  if (value === 0) {
    return (
      <Typography.Text
        type="secondary"
        data-testid={
          props.data
            ? `categories-table-products-cell-${props.data.handle}`
            : undefined
        }
      >
        0 products
      </Typography.Text>
    );
  }
  return (
    <Typography.Text
      data-testid={
        props.data
          ? `categories-table-products-cell-${props.data.handle}`
          : undefined
      }
    >
      {value} products
    </Typography.Text>
  );
};

const TextCellRenderer = (
  props: CustomCellRendererProps<ApiCategory, string>,
) => <Typography.Text>{props.value ?? ""}</Typography.Text>;

const DateCellRenderer = (
  props: CustomCellRendererProps<ApiCategory, string>,
) => <Typography.Text>{formatDetailDate(props.value)}</Typography.Text>;

export default function CategoriesPage() {
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiCategory>>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const { push: openCategoryModal } = useCategoryModal();
  const { push: openCreateCategoryModal } = useCreateCategoryModal();
  const pageConfig = usePageConfig<
    ApiCategory,
    ApiCategoryWhereInput,
    CategoryOrderField
  >({
    gridRef,
    storageKey: "categories-grid-state",
    filterSchema,
    sortFieldMapping: categorySortFieldMapping,
    defaultPageSize: 20,
    buildSearchCondition: buildCategorySearchCondition,
    filterTransformers: categoryFilterTransformers,
  });

  const listQueryVariables = useMemo<CategoriesQueryVariables>(
    () => buildCategoriesQueryVariables(pageConfig),
    [
      pageConfig.first,
      pageConfig.after,
      pageConfig.last,
      pageConfig.before,
      pageConfig.where,
      pageConfig.orderBy,
    ],
  );

  const {
    categories,
    totalCount,
    pageInfo,
    loading,
    error,
    refetch,
  } = useCategories(listQueryVariables);

  const handleOpenCreateCategoryModal = useCallback(() => {
    openCreateCategoryModal({
      onCreated: () => {
        void refetch();
      },
    });
  }, [openCreateCategoryModal, refetch]);

  const { goToNextPage, goToPrevPage } = pageConfig;

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

  const { rowSelection, selectionColumnDef, onCellClicked } =
    useAgGridRowSelection<ApiCategory>({
      onRowAction: (category) =>
        openCategoryModal({ entityId: category.id }),
    });

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<ApiCategory>) => {
      const selectedRows = event.api.getSelectedRows();
      setSelectedCount(selectedRows.length);
    },
    [],
  );

  const deselectAll = useCallback(() => {
    gridRef.current?.api.deselectAll();
    setSelectedCount(0);
  }, []);

  const selectionActions = useMemo<ActionConfig[]>(
    () => [
      {
        key: "delete",
        label: "Delete",
        icon: <DeleteOutlined />,
        danger: true,
        disabled: true,
        tooltip: "Category delete is not connected yet",
        onClick: () => undefined,
      },
    ],
    [],
  );

  const panels = useMemo<PanelConfig[]>(() => {
    const result: PanelConfig[] = [];
    if (selectedCount > 0) {
      result.push({
        type: "selection",
        count: selectedCount,
        actions: selectionActions,
        onDeselectAll: deselectAll,
      });
    }
    return result;
  }, [selectedCount, selectionActions, deselectAll]);

  const columnDefs = useMemo<ColDef<ApiCategory>[]>(
    () => [
      {
        headerName: "Category",
        field: "name",
        cellRenderer: CategoryCellRenderer,
        minWidth: 300,
        flex: 1,
      },
      {
        headerName: "Handle",
        field: "handle",
        cellRenderer: TextCellRenderer,
        minWidth: 180,
      },
      {
        headerName: "Status",
        field: "isPublished",
        cellRenderer: StatusCellRenderer,
        minWidth: 120,
        sortable: false,
      },
      {
        headerName: "Products",
        field: "productsCount",
        cellRenderer: ProductsCountCellRenderer,
        minWidth: 120,
        resizable: false,
      },
      {
        headerName: "Depth",
        field: "depth",
        minWidth: 100,
      },
      {
        headerName: "Parent",
        colId: "parent.name",
        valueGetter: ({ data }) => data?.parent?.name ?? "Root",
        cellRenderer: TextCellRenderer,
        minWidth: 160,
        sortable: false,
      },
      {
        headerName: "Updated",
        field: "updatedAt",
        cellRenderer: DateCellRenderer,
        minWidth: 140,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef>(
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
      name="categories"
      title="Categories"
      count={totalCount}
      actions={
        <Button
          data-testid="categories-create-button"
          icon={<PlusOutlined />}
          onClick={handleOpenCreateCategoryModal}
        >
          Create
        </Button>
      }
    >
      <DataLayout.Toolbar
        left={
          <FilterWidget
            {...pageConfig.filterWidgetProps}
            searchPlaceholder="Search categories..."
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
        {error && <Alert type="error" message={error.message} showIcon />}
        <div style={{ flex: 1, minHeight: 0 }} data-testid="categories-table">
          <AgGridReact<ApiCategory>
            ref={gridRef}
            theme={agGridTheme}
            rowData={categories}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={56}
            rowSelection={rowSelection}
            selectionColumnDef={selectionColumnDef}
            suppressCellFocus
            suppressMovableColumns
            onCellClicked={onCellClicked}
            onSelectionChanged={handleSelectionChanged}
            rowStyle={{ cursor: "pointer" }}
            initialState={pageConfig.gridStateProps.initialState}
            onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
            onSortChanged={pageConfig.onSortChanged}
          />
        </div>

        <CursorPagination
          name="categories"
          total={totalCount}
          rangeStart={pageConfig.getRangeStart(categories.length)}
          rangeEnd={Math.min(
            pageConfig.getRangeEnd(categories.length),
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

      <FloatingPanelStack panels={panels} />
    </DataLayout>
  );
}
