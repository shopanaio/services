"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { App, Image, Typography, Flex, Button, Tag } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import { useModalStack } from "@/layouts/modals";
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
import { useFilters, FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { FloatingPanelStack } from "@/ui-kit/floating-panel-stack";
import type { ActionConfig } from "@/ui-kit/floating-panel-stack/core/types";
import type { PanelConfig } from "@/ui-kit/floating-panel-stack/data-page/floating-panel-stack";
import {
  useGridState,
  useAgGridTheme,
  useAgGridRowSelection,
} from "@/hooks";
import { filterSchema } from "./filter-schema";
import { useDeleteProduct, useProducts } from "../hooks";
import { useBulkEditorStore } from "../modals/bulk-editor-modal";
import { useProductCreateModal } from "../modals";
import type { ApiProduct } from "@/graphql/types";
import {
  getProductBrandName,
  getProductPrimaryCategoryName,
  getProductThumbnailFile,
  getProductTotalAvailable,
} from "../utils/api-product-display";
import {
  PRODUCT_STATUS_COLORS,
  PRODUCT_STATUS_LABELS,
  getProductStatus,
  type ProductStatus,
} from "../utils/product-status";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

// Cell Renderers
const ProductCellRenderer = (
  props: CustomCellRendererProps<ApiProduct>,
) => {
  const { data } = props;
  if (!data) return null;
  const thumbnail = getProductThumbnailFile(data);
  return (
    <Flex
      align="center"
      gap="small"
      data-testid={`products-table-title-cell-${data.handle}`}
    >
      {thumbnail ? (
        <Image
          src={thumbnail.url}
          alt={thumbnail.altText ?? thumbnail.originalName ?? data.title}
          width={40}
          height={40}
          style={{ borderRadius: 4, objectFit: "cover" }}
          preview={false}
        />
      ) : (
        <div style={{ width: 40, height: 40, flex: "0 0 40px" }} />
      )}
      <Typography.Text strong>{data.title}</Typography.Text>
    </Flex>
  );
};

const StatusCellRenderer = (
  props: CustomCellRendererProps<ApiProduct, ProductStatus>,
) => {
  const { data, value } = props;
  const status = value ?? "draft";

  return (
    <Tag
      color={PRODUCT_STATUS_COLORS[status]}
      data-testid={
        data ? `products-table-status-cell-${data.handle}` : undefined
      }
    >
      {PRODUCT_STATUS_LABELS[status]}
    </Tag>
  );
};

const InventoryCellRenderer = (
  props: CustomCellRendererProps<ApiProduct, number>,
) => {
  const { data, value } = props;
  const testId = data
    ? `products-table-inventory-cell-${data.handle}`
    : undefined;

  if (value === 0) {
    return (
      <Typography.Text type="danger" data-testid={testId}>
        0 in stock
      </Typography.Text>
    );
  }
  return (
    <Typography.Text data-testid={testId}>
      {value ?? 0} in stock
    </Typography.Text>
  );
};

const TextCellRenderer = (
  props: CustomCellRendererProps<ApiProduct, string | null>,
) => {
  const { value } = props;
  return <Typography.Text>{value ?? ""}</Typography.Text>;
};

export default function ProductsPage() {
  const agGridTheme = useAgGridTheme();
  const { message } = App.useApp();
  const gridRef = useRef<AgGridReact<ApiProduct>>(null);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [pageIndex, setPageIndex] = useState(0);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([
    null,
  ]);
  const { widgetProps } = useFilters({ schema: filterSchema });
  const { push } = useModalStack();
  const after = cursorHistory[pageIndex] ?? null;
  const { products, totalCount, pageInfo, loading, refetch } = useProducts({
    first: pageSize,
    after,
  });
  const { deleteProduct, loading: deletingProducts } = useDeleteProduct();
  const { initialState, onStateUpdated } = useGridState({
    storageKey: "products-grid-state",
  });

  // Bulk editor store
  const setSelectedProducts = useBulkEditorStore((s) => s.setSelectedProducts);

  // Create product modal
  const { push: pushCreateModal } = useProductCreateModal();

  // Row selection with checkbox isolation
  const { rowSelection, selectionColumnDef, onCellClicked } =
    useAgGridRowSelection<ApiProduct>({
      onRowAction: (product) =>
        push("product", { entityId: product.id, mode: "view" }),
    });

  // Handle selection changes
  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<ApiProduct>) => {
      const selectedRows = event.api.getSelectedRows();
      setSelectedCount(selectedRows.length);
    },
    [],
  );

  // Deselect all
  const deselectAll = useCallback(() => {
    gridRef.current?.api.deselectAll();
    setSelectedCount(0);
  }, []);

  // Open bulk editor with selected products
  const handleBulkEdit = useCallback(() => {
    const selectedRows = gridRef.current?.api.getSelectedRows() || [];
    const productIds = selectedRows.map((product) => product.id);
    setSelectedProducts(productIds);
    push("bulk-editor", { productIds });
  }, [setSelectedProducts, push]);

  // Delete selected products
  const handleDeleteSelected = useCallback(async () => {
    const selectedRows = gridRef.current?.api.getSelectedRows() || [];

    if (selectedRows.length === 0) {
      return;
    }

    const results = await Promise.all(
      selectedRows.map((product) => deleteProduct({ id: product.id })),
    );
    const firstError = results.flatMap((result) => result.userErrors)[0];

    if (firstError) {
      message.error(firstError.message);
      return;
    }

    message.success(
      selectedRows.length === 1 ? "Product deleted" : "Products deleted",
    );
    deselectAll();
    await refetch();
  }, [deleteProduct, deselectAll, message, refetch]);

  const handleNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return;
    }

    setCursorHistory((current) => {
      const next = current.slice(0, pageIndex + 1);
      next[pageIndex + 1] = pageInfo.endCursor ?? null;
      return next;
    });
    setPageIndex((current) => current + 1);
  }, [pageInfo?.endCursor, pageIndex]);

  const handlePreviousPage = useCallback(() => {
    setPageIndex((current) => Math.max(0, current - 1));
  }, []);

  const handlePageSizeChange = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPageIndex(0);
    setCursorHistory([null]);
  }, []);

  // Build selection actions
  const selectionActions = useMemo<ActionConfig[]>(
    () => [
      {
        key: "bulk-edit",
        label: "Bulk Edit",
        icon: <EditOutlined />,
        disabled: true,
        tooltip: "Bulk editor is still a mock-only flow",
        onClick: handleBulkEdit,
      },
      {
        key: "delete",
        label: "Delete",
        icon: <DeleteOutlined />,
        danger: true,
        loading: deletingProducts,
        onClick: handleDeleteSelected,
      },
    ],
    [handleBulkEdit, handleDeleteSelected],
  );

  // Build floating panels
  const panels = useMemo<PanelConfig[]>(() => {
    const result: PanelConfig[] = [];

    if (selectedCount > 0) {
      // eslint-disable-next-line react-hooks/refs -- deselectAll is called on click, not during render
      result.push({
        type: "selection",
        count: selectedCount,
        actions: selectionActions,
        onDeselectAll: deselectAll,
      });
    }

    return result;
  }, [selectedCount, selectionActions, deselectAll]);

  const columnDefs = useMemo<ColDef<ApiProduct>[]>(
    () => [
      {
        headerName: "Product",
        field: "title",
        cellRenderer: ProductCellRenderer,
        minWidth: 300,
      },
      {
        headerName: "Status",
        valueGetter: ({ data }) => (data ? getProductStatus(data) : "draft"),
        cellRenderer: StatusCellRenderer,
        minWidth: 120,
      },
      {
        headerName: "Inventory",
        valueGetter: ({ data }) => (data ? getProductTotalAvailable(data) : 0),
        cellRenderer: InventoryCellRenderer,
        minWidth: 120,
      },
      {
        headerName: "Category",
        valueGetter: ({ data }) =>
          data ? getProductPrimaryCategoryName(data) : null,
        cellRenderer: TextCellRenderer,
        minWidth: 120,
      },
      {
        headerName: "Brand",
        valueGetter: ({ data }) => (data ? getProductBrandName(data) : null),
        cellRenderer: TextCellRenderer,
        minWidth: 120,
        resizable: false,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: false,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    [],
  );

  const handleCreate = useCallback(() => {
    pushCreateModal({});
  }, [pushCreateModal]);

  return (
    <DataLayout
      name="products"
      title="Products"
      count={totalCount}
      actions={
        <Button
          data-testid="products-create-button"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Create
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
        <div style={{ flex: 1 }} data-testid="products-table">
          <AgGridReact<ApiProduct>
            ref={gridRef}
            theme={agGridTheme}
            rowData={products}
            loading={loading || deletingProducts}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={52}
            rowSelection={rowSelection}
            selectionColumnDef={selectionColumnDef}
            suppressCellFocus
            suppressMovableColumns
            onCellClicked={onCellClicked}
            onSelectionChanged={handleSelectionChanged}
            rowStyle={{ cursor: "pointer" }}
            initialState={initialState}
            onStateUpdated={onStateUpdated}
          />
        </div>

        <CursorPagination
          name="products"
          total={totalCount}
          rangeStart={products.length ? pageIndex * pageSize + 1 : 0}
          rangeEnd={Math.min(pageIndex * pageSize + products.length, totalCount)}
          pageSize={pageSize}
          hasNext={pageInfo?.hasNextPage ?? false}
          hasPrev={pageIndex > 0}
          onNext={handleNextPage}
          onPrev={handlePreviousPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      <FloatingPanelStack panels={panels} />
    </DataLayout>
  );
}
