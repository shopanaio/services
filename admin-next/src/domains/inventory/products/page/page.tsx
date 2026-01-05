"use client";

import { useState, useMemo, useRef } from "react";
import { Image, Typography, Flex, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import { useModalStack } from "@/layouts/modals";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  PaginationModule,
  RowDragModule,
} from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { DataLayout } from "@/layouts/data";
import { useFilters, FilterWidget } from "@/layouts/filters";
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

export default function ProductsPage() {
  const gridRef = useRef<AgGridReact<IProductListItem>>(null);
  const [searchValue, setSearchValue] = useState("");
  const { widgetProps } = useFilters({ schema: filterSchema });
  const { push } = useModalStack();
  const { data: products } = useProducts();

  const handleOpenProductModal = () => {
    push('product', { level: 1 });
  };

  const filteredProducts = products;

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

  const handleCreate = () => {
    console.log("Create new product");
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
          <FilterWidget
            {...widgetProps}
            searchProps={{
              searchValue,
              onChangeSearchValue: setSearchValue,
            }}
          />
        }
      />

      <div style={{ height: "100%", paddingBottom: 16 }}>
        <AgGridReact<IProductListItem>
          ref={gridRef}
          rowData={filteredProducts}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
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
