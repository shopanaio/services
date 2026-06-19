"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Image, Typography, Flex, Button, Tag } from "antd";
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
  useGridSort,
  useAgGridTheme,
  useAgGridRowSelection,
} from "@/hooks";
import { filterSchema } from "./filter-schema";
import { useProducts } from "../hooks";
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
    <Flex align="center" gap="small">
      <Image
        src={thumbnail?.url}
        alt={thumbnail?.altText ?? thumbnail?.originalName ?? data.title}
        width={40}
        height={40}
        style={{ borderRadius: 4, objectFit: "cover" }}
        preview={false}
      />
      <Typography.Text strong>{data.title}</Typography.Text>
    </Flex>
  );
};

const StatusCellRenderer = (
  props: CustomCellRendererProps<ApiProduct, ProductStatus>,
) => {
  const { value } = props;
  const status = value ?? "draft";

  return (
    <Tag color={PRODUCT_STATUS_COLORS[status]}>
      {PRODUCT_STATUS_LABELS[status]}
    </Tag>
  );
};

const InventoryCellRenderer = (
  props: CustomCellRendererProps<ApiProduct, number>,
) => {
  const { value } = props;
  if (value === 0) {
    return <Typography.Text type="danger">0 in stock</Typography.Text>;
  }
  return <Typography.Text>{value ?? 0} in stock</Typography.Text>;
};

const TextCellRenderer = (
  props: CustomCellRendererProps<ApiProduct, string | null>,
) => {
  const { value } = props;
  return <Typography.Text>{value ?? ""}</Typography.Text>;
};

export default function ProductsPage() {
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiProduct>>(null);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const { widgetProps } = useFilters({ schema: filterSchema });
  const { push } = useModalStack();
  const { products, totalCount, pageInfo } = useProducts({ page, pageSize });
  const { initialState, onStateUpdated } = useGridState({
    storageKey: "products-grid-state",
  });

  // Bulk editor store
  const setSelectedProducts = useBulkEditorStore((s) => s.setSelectedProducts);

  // Create product modal
  const { push: pushCreateModal } = useProductCreateModal();

  const { onSortChanged } = useGridSort({
    gridRef,
    onSortChange: (model) => {
      // TODO: Replace with actual API call
      console.log("Sort changed:", model);
    },
  });

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
    // Map product IDs to bulk editor format (prod-1, prod-2, etc.)
    // For demo purposes, we use the first 12 products from bulk editor mock
    const bulkEditorIds = selectedRows.map(
      (_, index) => `prod-${(index % 12) + 1}`,
    );
    setSelectedProducts(bulkEditorIds);
    push("bulk-editor", { productIds: bulkEditorIds });
  }, [setSelectedProducts, push]);

  // Delete selected products
  const handleDeleteSelected = useCallback(() => {
    const selectedRows = gridRef.current?.api.getSelectedRows() || [];
    // TODO: Implement delete mutation
    console.log(
      "Delete products:",
      selectedRows.map((r) => r.id),
    );
    deselectAll();
  }, [deselectAll]);

  // Build selection actions
  const selectionActions = useMemo<ActionConfig[]>(
    () => [
      {
        key: "bulk-edit",
        label: "Bulk Edit",
        icon: <EditOutlined />,
        onClick: handleBulkEdit,
      },
      {
        key: "delete",
        label: "Delete",
        icon: <DeleteOutlined />,
        danger: true,
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
      sortable: true,
      // Disable client-side sorting - server handles it
      comparator: () => 0,
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
        <Button icon={<PlusOutlined />} onClick={handleCreate}>
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
        <div style={{ flex: 1 }}>
          <AgGridReact<ApiProduct>
            ref={gridRef}
            theme={agGridTheme}
            rowData={products}
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
            onSortChanged={onSortChanged}
          />
        </div>

        <CursorPagination
          total={totalCount}
          rangeStart={products.length ? page * pageSize + 1 : 0}
          rangeEnd={Math.min((page + 1) * pageSize, totalCount)}
          pageSize={pageSize}
          hasNext={pageInfo?.hasNextPage ?? false}
          hasPrev={pageInfo?.hasPreviousPage ?? false}
          onNext={() => setPage((current) => current + 1)}
          onPrev={() => setPage((current) => Math.max(0, current - 1))}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(0);
          }}
        />
      </div>

      <FloatingPanelStack panels={panels} />
    </DataLayout>
  );
}
