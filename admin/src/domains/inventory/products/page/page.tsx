"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { Image, Typography, Flex, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
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
  FilterType,
  FilterOperator,
  FilterWidget,
  numberOperators,
  stringOperators,
  enumOperators,
  type IFilterSchema,
  type IFilterValue,
} from "@/layouts/filters";

ModuleRegistry.registerModules([AllCommunityModule, PaginationModule, RowDragModule]);

interface IProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  status: "active" | "draft" | "archived";
  category: string;
  image: string;
}

const productNames = [
  "iPhone 15 Pro Max",
  "Samsung Galaxy S24 Ultra",
  "MacBook Pro 16",
  "Sony WH-1000XM5",
  "iPad Air M2",
  "Dell XPS 15",
  "AirPods Pro 2",
  "Google Pixel 8 Pro",
  "Nintendo Switch OLED",
  "Logitech MX Master 3S",
  "Sony PlayStation 5",
  "Xbox Series X",
  "LG OLED TV 55",
  "Bose QuietComfort 45",
  "Canon EOS R5",
  "DJI Mavic 3 Pro",
  "Apple Watch Ultra 2",
  "Samsung Galaxy Watch 6",
  "Razer BlackWidow V4",
  "SteelSeries Arctis Nova",
  "ASUS ROG Strix",
  "MSI Titan GT77",
  "Lenovo ThinkPad X1",
  "HP Spectre x360",
  "Acer Predator Helios",
  "Corsair K100 RGB",
  "Elgato Stream Deck",
  "Blue Yeti X",
  "Shure SM7B",
  "Rode NT1",
  "Wacom Cintiq Pro",
  "Huion Kamvas 24",
  "BenQ PD3220U",
  "LG UltraGear 27",
  "Samsung Odyssey G9",
  "Secretlab Titan",
  "Herman Miller Aeron",
  "Dyson V15 Detect",
  "iRobot Roomba j7",
  "Sonos Arc",
  "KEF LS50 Meta",
  "Sennheiser HD 800S",
  "Focal Clear MG",
  "Anker PowerCore",
  "Belkin MagSafe",
  "CalDigit TS4",
  "OWC Thunderbay",
  "Synology DS923+",
  "QNAP TS-464",
  "Ubiquiti Dream Machine",
];

const categories = ["Electronics", "Computers", "Audio", "Gaming", "Accessories"];
const statuses: IProduct["status"][] = ["active", "draft", "archived"];

const mockProducts: IProduct[] = Array.from({ length: 50 }, (_, i) => ({
  id: String(i + 1),
  name: productNames[i % productNames.length],
  sku: `SKU-${String(i + 1).padStart(4, "0")}`,
  price: Math.floor(Math.random() * 2000) + 99,
  stock: Math.floor(Math.random() * 150),
  status: statuses[i % 10 === 0 ? 2 : i % 7 === 0 ? 1 : 0],
  category: categories[i % categories.length],
  image: `https://picsum.photos/seed/${i + 1}/40/40`,
}));

// Cell Renderers
const ProductCellRenderer = (props: CustomCellRendererProps<IProduct>) => {
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

const filterSchema: IFilterSchema[] = [
  {
    key: "status",
    label: "Status",
    description: "Filter by product status",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "status",
    options: [
      { label: "Active", value: "active" },
      { label: "Draft", value: "draft" },
      { label: "Archived", value: "archived" },
    ],
  },
  {
    key: "category",
    label: "Category",
    description: "Filter by category",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "category",
    options: [
      { label: "Electronics", value: "Electronics" },
      { label: "Computers", value: "Computers" },
      { label: "Audio", value: "Audio" },
      { label: "Gaming", value: "Gaming" },
      { label: "Accessories", value: "Accessories" },
    ],
  },
  {
    key: "price",
    label: "Price",
    description: "Filter by price",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "price",
  },
  {
    key: "stock",
    label: "Stock",
    description: "Filter by stock quantity",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "stock",
  },
  {
    key: "name",
    label: "Name",
    description: "Filter by product name",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "name",
  },
];

/**
 * Apply filters to data (client-side filtering)
 * This is a simple implementation - in real app, you'd use an adapter for API
 */
function applyFiltersToData(
  data: IProduct[],
  filters: IFilterValue[],
  searchValue: string
): IProduct[] {
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
    const key = filter.payloadKey as keyof IProduct;
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
  const gridRef = useRef<AgGridReact<IProduct>>(null);
  const [selectedRows, setSelectedRows] = useState<IProduct[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const { filters, widgetProps } = useFilters({ schema: filterSchema });

  const filteredProducts = useMemo(() => {
    return applyFiltersToData(mockProducts, filters, searchValue);
  }, [searchValue, filters]);

  const columnDefs = useMemo<ColDef<IProduct>[]>(
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

  const onSelectionChanged = useCallback((event: SelectionChangedEvent<IProduct>) => {
    const selected = event.api.getSelectedRows();
    setSelectedRows(selected);
  }, []);

  const handleDelete = (rows: IProduct[]) => {
    console.log("Delete products:", rows);
  };

  const handleArchive = (rows: IProduct[]) => {
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
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Product
        </Button>
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

      <div style={{ height: "100%", paddingBottom: "var(--x4)" }}>
        <AgGridReact<IProduct>
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
