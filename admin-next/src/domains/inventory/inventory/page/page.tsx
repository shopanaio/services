"use client";

import { useState, useMemo, useRef } from "react";
import { Image, Typography, Flex, Button } from "antd";
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

const ProductCellRenderer = (
  props: CustomCellRendererProps<IInventoryListItem>
) => {
  const { data } = props;
  if (!data) return null;

  return (
    <Flex align="center" gap="small">
      <Image
        src={data.image}
        alt={data.productName}
        width={40}
        height={40}
        style={{ borderRadius: 4, objectFit: "cover" }}
        preview={false}
      />
      <Flex vertical gap={0}>
        <Typography.Text strong style={{ lineHeight: 1.3 }}>
          {data.productName}
        </Typography.Text>
        {data.variantName && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {data.variantName}
          </Typography.Text>
        )}
      </Flex>
    </Flex>
  );
};

const AvailableCellRenderer = (
  props: CustomCellRendererProps<IInventoryListItem>
) => {
  const { value } = props;
  if (value === 0) {
    return <Typography.Text type="danger">{value}</Typography.Text>;
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
        headerName: "Product",
        field: "productName",
        cellRenderer: ProductCellRenderer,
        flex: 2,
        minWidth: 280,
      },
      {
        headerName: "SKU",
        field: "sku",
        width: 130,
      },
      {
        headerName: "On hand",
        field: "onHand",
        width: 120,
        type: "rightAligned",
      },
      {
        headerName: "Unavailable",
        field: "unavailable",
        width: 120,
        type: "rightAligned",
      },
      {
        headerName: "Reserved",
        field: "reserved",
        width: 120,
        type: "rightAligned",
      },
      {
        headerName: "Available",
        field: "available",
        cellRenderer: AvailableCellRenderer,
        width: 120,
        type: "rightAligned",
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    []
  );

  return (
    <DataLayout
      name="inventory"
      title="Inventory"
      count={inventory.length}
      actions={
        <Flex gap="small">
          <Button>Export</Button>
          <Button>Import</Button>
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
              placeholder: "Search by product or SKU",
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
            rowHeight={56}
          />
        </div>

        <CursorPagination
          total={inventory.length}
          rangeStart={1}
          rangeEnd={Math.min(20, inventory.length)}
          pageSize={20}
          hasNext={inventory.length > 20}
          hasPrev={false}
          onNext={() => {}}
          onPrev={() => {}}
          onPageSizeChange={() => {}}
        />
      </div>
    </DataLayout>
  );
}
