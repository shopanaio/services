"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
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
import {
  FloatingPanelStack,
  usePanelOrder,
  type PanelConfig,
  type ActionConfig,
} from "@/ui-kit/floating-panel-stack";
import { useGridState, useGridSort, useAgGridTheme, useAgGridRowSelection } from "@/hooks";
import { filterSchema } from "./filter-schema";
import { useProducts } from "../hooks";
import type { IProductListItem } from "@/mocks/products/products-list";
import { useBulkEditorStore } from "../modals/bulk-editor-modal";
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
  const agGridTheme = useAgGridTheme();
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

  // Row selection with checkbox isolation
  const { rowSelection, selectionColumnDef, onCellClicked } = useAgGridRowSelection<IProductListItem>({
    onRowAction: () => push("product", { level: 1 }),
  });

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
    const bulkEditorIds = selectedRows.map(
      (_, index) => `prod-${(index % 12) + 1}`
    );
    setSelectedProducts(bulkEditorIds);
    push("bulk-editor", { productIds: bulkEditorIds });
  }, [setSelectedProducts, push]);

  // Delete selected products
  const handleDeleteSelected = useCallback(() => {
    const selectedRows = gridRef.current?.api.getSelectedRows() || [];
    // TODO: Implement delete mutation
    console.log("Delete products:", selectedRows.map((r) => r.id));
  }, []);

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
    [handleBulkEdit, handleDeleteSelected]
  );

  // Track panel activation order
  const { sortPanels, trackActivePanels } = usePanelOrder();

  const hasSelectionPanel = selectedCount > 0;

  // Auto-track panel activations
  useEffect(() => {
    trackActivePanels({
      hasEditing: false,
      hasSelection: hasSelectionPanel,
    });
  }, [hasSelectionPanel, trackActivePanels]);

  // Build floating panels
  const panels = useMemo<PanelConfig[]>(() => {
    const result: PanelConfig[] = [];

    if (hasSelectionPanel) {
      result.push({
        type: "selection",
        count: selectedCount,
        actions: selectionActions,
        onDeselectAll: () => gridRef.current?.api.deselectAll(),
      });
    }

    return sortPanels(result);
  }, [hasSelectionPanel, selectedCount, selectionActions, sortPanels]);

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
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
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
          <AgGridReact<IProductListItem>
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

      <FloatingPanelStack panels={panels} />
    </DataLayout>
  );
}
