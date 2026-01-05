"use client";

import { useState, useMemo, useRef } from "react";
import { Typography, Flex, Button, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  RowSelectionModule,
} from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { DataLayout } from "@/layouts/data";
import { useFilters, FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/CursorPagination";
import { filterSchema } from "./filterSchema";
import { useInventory } from "../hooks";
import type { IInventoryListItem } from "../mocks/inventory-list";

ModuleRegistry.registerModules([AllCommunityModule, RowSelectionModule]);

const StatusCellRenderer = (
  props: CustomCellRendererProps<IInventoryListItem>
) => {
  const { value } = props;
  const config: Record<string, { color: string; label: string }> = {
    in_stock: { color: "success", label: "In Stock" },
    low_stock: { color: "warning", label: "Low Stock" },
    out_of_stock: { color: "error", label: "Out of Stock" },
  };
  const { color, label } = config[value] || config.out_of_stock;
  return <Tag color={color}>{label}</Tag>;
};

const QuantityCellRenderer = (
  props: CustomCellRendererProps<IInventoryListItem>
) => {
  const { value } = props;
  if (value === 0) {
    return <Typography.Text type="danger">0</Typography.Text>;
  }
  if (value < 10) {
    return <Typography.Text type="warning">{value}</Typography.Text>;
  }
  return <Typography.Text>{value}</Typography.Text>;
};

export default function InventoryPage() {
  const gridRef = useRef<AgGridReact<IInventoryListItem>>(null);
  const [searchValue, setSearchValue] = useState("");
  const { widgetProps } = useFilters({ schema: filterSchema });
  const { data: inventory } = useInventory();

  const columnDefs = useMemo<ColDef<IInventoryListItem>[]>(
    () => [
      {
        headerName: "SKU",
        field: "sku",
        width: 150,
      },
      {
        headerName: "Product",
        field: "productName",
        flex: 2,
        minWidth: 200,
      },
      {
        headerName: "Location",
        field: "location",
        width: 150,
      },
      {
        headerName: "Status",
        field: "status",
        cellRenderer: StatusCellRenderer,
        width: 130,
      },
      {
        headerName: "Quantity",
        field: "quantity",
        cellRenderer: QuantityCellRenderer,
        width: 100,
      },
      {
        headerName: "Reserved",
        field: "reserved",
        width: 100,
      },
      {
        headerName: "Available",
        field: "available",
        cellRenderer: QuantityCellRenderer,
        width: 100,
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
    console.log("Add inventory");
  };

  return (
    <DataLayout
      name="inventory"
      title="Inventory"
      count={inventory.length}
      actions={
        <Flex gap="small">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Inventory
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

      <div
        style={{
          height: "100%",
          paddingBottom: 16,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1 }}>
          <AgGridReact<IInventoryListItem>
            ref={gridRef}
            rowData={inventory}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
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
