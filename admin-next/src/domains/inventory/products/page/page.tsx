"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { Image, Typography, Flex, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import { useModalStack } from "@/layouts/modals";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  RowSelectionOptions,
  SelectionChangedEvent,
  PaginationModule,
  RowDragModule,
} from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { DataLayout } from "@/layouts/data";
import { Actions } from "@/layouts/table/components/Navigation/Actions";
import {
  useFilters,
  FilterOperator,
  FilterWidget,
  type IFilterValue,
} from "@/layouts/filters";
import { filterSchema } from "./filterSchema";
import { useProducts } from "../hooks";
import type { IProductListItem } from "../mocks/products-list";

ModuleRegistry.registerModules([AllCommunityModule, PaginationModule, RowDragModule]);

// Cell Renderers
const ProductCellRenderer = (props: CustomCellRendererProps<IProductListItem>) => {
  const { data } = props;
  if (!data) return null;
  return (
    <Flex align="center" gap="small">
      <Image
        src={data.image}
        alt={data.name}
        width={40}
        height={40}
        style={{ borderRadius: 4 }}
        preview={false}
      />
      <Typography.Text strong>{data.name}</Typography.Text>
    </Flex>
  );
};

/**
 * Apply filters to data (client-side filtering)
 * This is a simple implementation - in real app, you'd use an adapter for API
 */
function applyFiltersToData(
  data: IProductListItem[],
  filters: IFilterValue[],
  searchValue: string
): IProductListItem[] {
  let result = data;

  // Apply search
  if (searchValue) {
    const search = searchValue.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search)
    );
  }

  // Apply filters
  filters.forEach((filter) => {
    const key = filter.payloadKey as keyof IProductListItem;
    const { operator, value } = filter;

    if (!value || (Array.isArray(value) && value.length === 0)) return;

    result = result.filter((product) => {
      const productValue = product[key];

      switch (operator) {
        case FilterOperator.In:
          return (value as unknown[]).includes(productValue);
        case FilterOperator.Eq:
          return productValue === (value as unknown[])[0];
        case FilterOperator.Gt:
          return (productValue as number) > (value as number[])[0];
        case FilterOperator.Gte:
          return (productValue as number) >= (value as number[])[0];
        case FilterOperator.Lt:
          return (productValue as number) < (value as number[])[0];
        case FilterOperator.Lte:
          return (productValue as number) <= (value as number[])[0];
        case FilterOperator.ILike:
          return String(productValue)
            .toLowerCase()
            .includes(String((value as unknown[])[0]).toLowerCase());
        default:
          return true;
      }
    });
  });

  return result;
}

export default function ProductsPage() {
  const gridRef = useRef<AgGridReact<IProductListItem>>(null);
  const [selectedRows, setSelectedRows] = useState<IProductListItem[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const { filters, widgetProps } = useFilters({ schema: filterSchema });
  const { push } = useModalStack();
  const { data: products, isLoading } = useProducts();

  const handleOpenProductModal = () => {
    push('product', { level: 1 });
  };

  const filteredProducts = useMemo(() => {
    return applyFiltersToData(products, filters, searchValue);
  }, [products, searchValue, filters]);

  const columnDefs = useMemo<ColDef<IProductListItem>[]>(
    () => [
      {
        headerName: "Product",
        field: "name",
        cellRenderer: ProductCellRenderer,
        flex: 1,
        rowDrag: true,
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
    }),
    []
  );

  const rowSelection = useMemo<RowSelectionOptions>(
    () => ({
      mode: "multiRow",
      checkboxes: true,
      headerCheckbox: true,
    }),
    []
  );

  const handleCreate = () => {
    console.log("Create new product");
  };

  const onSelectionChanged = useCallback((event: SelectionChangedEvent<IProductListItem>) => {
    const selected = event.api.getSelectedRows();
    setSelectedRows(selected);
  }, []);

  const handleDelete = (rows: IProductListItem[]) => {
    console.log("Delete products:", rows);
  };

  const handleArchive = (rows: IProductListItem[]) => {
    console.log("Archive products:", rows);
  };

  const clearSelectedRows = () => {
    gridRef.current?.api.deselectAll();
    setSelectedRows([]);
  };

  return (
    <DataLayout
      name="products"
      title="Products"
      count={filteredProducts.length}
      actions={
        <Flex gap="small">
          <Button onClick={handleOpenProductModal}>
            Open Product
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Product
          </Button>
        </Flex>
      }
    >
      <DataLayout.Toolbar
        left={
          <>
            {selectedRows.length > 0 && (
              <Actions
                selectedRows={selectedRows}
                clearSelectedRows={clearSelectedRows}
                onDelete={handleDelete}
                onArchive={handleArchive}
              />
            )}
            <FilterWidget
              {...widgetProps}
              searchProps={{
                searchValue,
                onChangeSearchValue: setSearchValue,
              }}
            />
          </>
        }
      />

      <div style={{ height: "100%", paddingBottom: 16 }}>
        <AgGridReact<IProductListItem>
          ref={gridRef}
          rowData={filteredProducts}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowSelection={rowSelection}
          onSelectionChanged={onSelectionChanged}
          getRowId={(params) => params.data.id}
          pagination={true}
          paginationPageSize={10}
          rowDragManaged={true}
          suppressMoveWhenRowDragging={false}
        />
      </div>
    </DataLayout>
  );
}
