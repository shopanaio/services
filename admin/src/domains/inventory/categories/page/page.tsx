"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Image, Typography, Flex, Button, Tag, Avatar } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  FolderOutlined,
} from "@ant-design/icons";
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
  type PanelConfig,
  type ActionConfig,
} from "@/ui-kit/floating-panel-stack";
import {
  useGridState,
  useGridSort,
  useAgGridTheme,
  useAgGridRowSelection,
} from "@/hooks";
import { filterSchema } from "./filter-schema";
import { useCategories } from "../hooks";
import type { ICategoryListItem } from "@/mocks/products/categories-list";

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowSelectionModule,
  GridStateModule,
]);

// ============================================================================
// Cell Renderers
// ============================================================================

const CategoryCellRenderer = (
  props: CustomCellRendererProps<ICategoryListItem>
) => {
  const { data } = props;
  if (!data) return null;
  return (
    <Flex align="center" gap="small">
      {data.image ? (
        <Image
          src={data.image}
          alt={data.name}
          width={40}
          height={40}
          style={{ borderRadius: 4, objectFit: "cover" }}
          preview={false}
        />
      ) : (
        <Avatar
          size={40}
          icon={<FolderOutlined />}
          shape="square"
          style={{ borderRadius: 4, flexShrink: 0 }}
        />
      )}
      <Typography.Text strong>{data.name}</Typography.Text>
    </Flex>
  );
};

const StatusCellRenderer = (
  props: CustomCellRendererProps<ICategoryListItem>
) => {
  const { value } = props;
  const config: Record<string, { color: string; label: string }> = {
    published: { color: "success", label: "Published" },
    draft: { color: "default", label: "Draft" },
    archived: { color: "error", label: "Archived" },
  };
  const { color, label } = config[value] || config.draft;
  return <Tag color={color}>{label}</Tag>;
};

const ProductsCountCellRenderer = (
  props: CustomCellRendererProps<ICategoryListItem>
) => {
  const { value } = props;
  if (value === 0) {
    return (
      <Typography.Text type="secondary">0 products</Typography.Text>
    );
  }
  return <Typography.Text>{value} products</Typography.Text>;
};

// ============================================================================
// Page Component
// ============================================================================

export default function CategoriesPage() {
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ICategoryListItem>>(null);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const { widgetProps } = useFilters({ schema: filterSchema });
  const { push } = useModalStack();
  const { data: categories } = useCategories();
  const { initialState, onStateUpdated } = useGridState({
    storageKey: "categories-grid-state",
  });

  const { onSortChanged } = useGridSort({
    gridRef,
    onSortChange: (model) => {
      console.log("Sort changed:", model);
    },
  });

  const { rowSelection, selectionColumnDef, onCellClicked } =
    useAgGridRowSelection<ICategoryListItem>({
      onRowAction: () => {
        push("category", { level: 1 });
      },
    });

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<ICategoryListItem>) => {
      const selectedRows = event.api.getSelectedRows();
      setSelectedCount(selectedRows.length);
    },
    []
  );

  const deselectAll = useCallback(() => {
    gridRef.current?.api.deselectAll();
    setSelectedCount(0);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    const selectedRows = gridRef.current?.api.getSelectedRows() || [];
    console.log(
      "Delete categories:",
      selectedRows.map((r) => r.id)
    );
    deselectAll();
  }, [deselectAll]);

  const selectionActions = useMemo<ActionConfig[]>(
    () => [
      {
        key: "delete",
        label: "Delete",
        icon: <DeleteOutlined />,
        danger: true,
        onClick: handleDeleteSelected,
      },
    ],
    [handleDeleteSelected]
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

  const columnDefs = useMemo<ColDef<ICategoryListItem>[]>(
    () => [
      {
        headerName: "Category",
        field: "name",
        cellRenderer: CategoryCellRenderer,
        minWidth: 300,
      },
      {
        headerName: "Status",
        field: "status",
        cellRenderer: StatusCellRenderer,
        minWidth: 120,
      },
      {
        headerName: "Products",
        field: "productsCount",
        cellRenderer: ProductsCountCellRenderer,
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

  const handleCreate = useCallback(() => {
    console.log("Create category");
  }, []);

  return (
    <DataLayout
      name="categories"
      title="Categories"
      count={categories.length}
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
          <AgGridReact<ICategoryListItem>
            ref={gridRef}
            theme={agGridTheme}
            rowData={categories}
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
          total={categories.length}
          rangeStart={1}
          rangeEnd={categories.length}
          pageSize={30}
          hasNext={false}
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
