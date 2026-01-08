"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Image, Typography, Flex, Button, Tag, Space } from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import { useModalStack } from "@/layouts/modals";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  RowSelectionModule,
  CellClickedEvent,
  GridStateModule,
  SelectionChangedEvent,
} from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { DataLayout } from "@/layouts/data";
import { useFilters, FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/CursorPagination";
import { useGridState, useGridSort } from "@/hooks";
import { filterSchema } from "./filterSchema";
import { useProducts } from "../hooks";
import type { IProductListItem } from "../mocks/products-list";
import { useBulkEditorStore } from "../bulk-editor";
import { useProductCreateModal } from "../modals";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

// Cell Renderers
const ProductCellRenderer = (
  props: CustomCellRendererProps<IProductListItem>
) => {
  const { data } = props;
  if (!data) return null;
  return (
    <Flex align="center" gap="small">
      <Image
        src={data.image}
        alt={data.name}
        width={40}
        height={40}
        style={{ borderRadius: 4, objectFit: "cover" }}
        preview={false}
      />
      <Typography.Text strong>{data.name}</Typography.Text>
    </Flex>
  );
};

const StatusCellRenderer = (
  props: CustomCellRendererProps<IProductListItem>
) => {
  const { value } = props;
  const config: Record<string, { color: string; label: string }> = {
    published: { color: "success", label: "Published" },
    draft: { color: "default", label: "Draft" },
  };
  const { color, label } = config[value] || config.draft;
  return <Tag color={color}>{label}</Tag>;
};

const InventoryCellRenderer = (
  props: CustomCellRendererProps<IProductListItem>
) => {
  const { value } = props;
  if (value === 0) {
    return <Typography.Text type="danger">0 in stock</Typography.Text>;
  }
  return <Typography.Text>{value} in stock</Typography.Text>;
};

export default function ProductsPage() {
  const gridRef = useRef<AgGridReact<IProductListItem>>(null);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const { widgetProps } = useFilters({ schema: filterSchema });
  const { push } = useModalStack();
  const { data: products } = useProducts();
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

  const handleCellClick = (event: CellClickedEvent<IProductListItem>) => {
    if (event.column.getColId() === "ag-Grid-SelectionColumn") {
      event.node.setSelected(!event.node.isSelected());
      return;
    }
    push("product", { level: 1 });
  };

  // Handle selection changes
  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<IProductListItem>) => {
      const selectedRows = event.api.getSelectedRows();
      setSelectedCount(selectedRows.length);
    },
    []
  );

  // Open bulk editor with selected products
  const handleBulkEdit = useCallback(() => {
    const selectedRows = gridRef.current?.api.getSelectedRows() || [];
    // Map product IDs to bulk editor format (prod-1, prod-2, etc.)
    // For demo purposes, we use the first 12 products from bulk editor mock
    const bulkEditorIds = selectedRows.map((_, index) => `prod-${(index % 12) + 1}`);
    setSelectedProducts(bulkEditorIds);
    push("bulk-editor", { productIds: bulkEditorIds });
  }, [setSelectedProducts, push]);

  const columnDefs = useMemo<ColDef<IProductListItem>[]>(
    () => [
      {
        headerName: "Product",
        field: "name",
        cellRenderer: ProductCellRenderer,
        minWidth: 300,
      },
      {
        headerName: "Status",
        field: "status",
        cellRenderer: StatusCellRenderer,
        minWidth: 120,
      },
      {
        headerName: "Inventory",
        field: "inventory",
        cellRenderer: InventoryCellRenderer,
        minWidth: 120,
      },
      {
        headerName: "Category",
        field: "category",
        minWidth: 120,
      },
      {
        headerName: "Brand",
        field: "brand",
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
      // Disable client-side sorting - server handles it
      comparator: () => 0,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    []
  );

  const handleCreate = useCallback(() => {
    pushCreateModal({});
  }, [pushCreateModal]);

  return (
    <DataLayout
      name="products"
      title="Products"
      count={products.length}
      actions={
        <Space>
          {selectedCount > 0 && (
            <Button icon={<EditOutlined />} onClick={handleBulkEdit}>
              Bulk Edit ({selectedCount})
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Product
          </Button>
        </Space>
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
          <AgGridReact<IProductListItem>
            ref={gridRef}
            rowData={products}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={52}
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
            onCellClicked={handleCellClick}
            onSelectionChanged={handleSelectionChanged}
            rowStyle={{ cursor: "pointer" }}
            initialState={initialState}
            onStateUpdated={onStateUpdated}
            onSortChanged={onSortChanged}
          />
        </div>

        <CursorPagination
          total={50}
          rangeStart={1}
          rangeEnd={20}
          pageSize={20}
          hasNext={true}
          hasPrev={false}
          onNext={() => {}}
          onPrev={() => {}}
          onPageSizeChange={() => {}}
        />
      </div>
    </DataLayout>
  );
}
