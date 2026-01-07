import { useMemo } from "react";
import type { ColDef, EditableCallbackParams, ValueGetterParams } from "ag-grid-community";
import { useBulkEditorStore } from "./useBulkEditorStore";
import { IBulkEditorRow, ALL_COLUMNS, PRODUCT_COLUMNS, VARIANT_COLUMNS } from "../types";
import {
  TitleCellRenderer,
  PriceCellRenderer,
  StockCellRenderer,
  StockStatusRenderer,
  ProductStatusRenderer,
  TextCellRenderer,
  NumberCellRenderer,
} from "../components/cell-renderers";

const VARIANT_FIELDS = new Set([
  "sku",
  "barcode",
  "price",
  "compareAtPrice",
  "costPrice",
  "stock",
  "stockStatus",
  "weight",
  "weightUnit",
  "length",
  "width",
  "height",
  "dimensionUnit",
]);

// Check if cell should be editable
function isCellEditable(params: EditableCallbackParams<IBulkEditorRow>): boolean {
  const { data, colDef } = params;
  if (!data || !colDef?.field) return false;

  const column = ALL_COLUMNS.find((c) => c.field === colDef.field);
  if (!column || !column.editable) return false;

  const { rowType } = data;
  const isVariantColumn = VARIANT_FIELDS.has(column.field as string);

  // Single variant product: all columns editable
  if (rowType === "single-variant-product") return true;

  // Product row: only product columns editable
  if (rowType === "product") return !isVariantColumn;

  // Variant row: only variant columns editable
  if (rowType === "variant") return isVariantColumn;

  return false;
}

// Get value or return null for dash cells
function createValueGetter(field: keyof IBulkEditorRow) {
  return (params: ValueGetterParams<IBulkEditorRow>) => {
    const { data } = params;
    if (!data) return null;

    const isVariantColumn = VARIANT_FIELDS.has(field as string);
    const shouldShowDash =
      (data.rowType === "product" && isVariantColumn) ||
      (data.rowType === "variant" && !isVariantColumn);

    if (shouldShowDash) return null;

    return data[field];
  };
}

// Get cell renderer based on column type
function getCellRenderer(column: (typeof ALL_COLUMNS)[0]) {
  switch (column.type) {
    case "currency":
      return PriceCellRenderer;
    case "badge":
      if (column.field === "stockStatus") return StockStatusRenderer;
      if (column.field === "productStatus") return ProductStatusRenderer;
      return undefined;
    case "number":
      if (column.field === "stock") return StockCellRenderer;
      return NumberCellRenderer;
    case "text":
      return TextCellRenderer;
    case "select":
      if (column.field === "productStatus") return ProductStatusRenderer;
      return TextCellRenderer;
    default:
      return undefined;
  }
}

// Get cell editor based on column type
function getCellEditor(column: (typeof ALL_COLUMNS)[0]) {
  switch (column.type) {
    case "currency":
    case "number":
      return "agNumberCellEditor";
    case "text":
      return "agTextCellEditor";
    case "select":
      return "agSelectCellEditor";
    default:
      return "agTextCellEditor";
  }
}

// Get cell editor params
function getCellEditorParams(column: (typeof ALL_COLUMNS)[0]) {
  switch (column.field) {
    case "productStatus":
      return { values: ["published", "draft"] };
    case "weightUnit":
      return { values: ["g", "kg", "oz", "lb"] };
    case "dimensionUnit":
      return { values: ["mm", "cm", "m", "in"] };
    case "price":
    case "compareAtPrice":
    case "costPrice":
      return { min: 0 };
    case "stock":
      return { min: 0, precision: 0 };
    case "weight":
    case "length":
    case "width":
    case "height":
      return { min: 0, precision: 2 };
    default:
      return undefined;
  }
}

export function useBulkEditorColumns(): ColDef<IBulkEditorRow>[] {
  const columnVisibility = useBulkEditorStore((s) => s.columnVisibility);

  return useMemo(() => {
    const columns: ColDef<IBulkEditorRow>[] = [];

    // Fixed: Title column - editable for all row types
    columns.push({
      field: "title",
      headerName: "Product / Variant",
      flex: 1,
      minWidth: 250,
      cellRenderer: TitleCellRenderer,
      pinned: "left",
      editable: true,
      cellEditor: "agTextCellEditor",
    });

    // Product columns
    for (const col of PRODUCT_COLUMNS) {
      if (!columnVisibility[col.field]) continue;

      columns.push({
        field: col.field,
        headerName: col.headerName,
        width: col.width,
        minWidth: col.minWidth,
        flex: col.flex,
        editable: isCellEditable,
        cellRenderer: getCellRenderer(col),
        cellEditor: getCellEditor(col),
        cellEditorParams: getCellEditorParams(col),
        valueGetter: createValueGetter(col.field),
      });
    }

    // Variant columns
    for (const col of VARIANT_COLUMNS) {
      if (!columnVisibility[col.field]) continue;

      columns.push({
        field: col.field,
        headerName: col.headerName,
        width: col.width,
        minWidth: col.minWidth,
        flex: col.flex,
        editable: col.editable ? isCellEditable : false,
        cellRenderer: getCellRenderer(col),
        cellEditor: getCellEditor(col),
        cellEditorParams: getCellEditorParams(col),
        valueGetter: createValueGetter(col.field),
      });
    }

    return columns;
  }, [columnVisibility]);
}
