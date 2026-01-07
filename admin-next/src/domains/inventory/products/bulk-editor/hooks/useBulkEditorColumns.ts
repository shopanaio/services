import { useMemo } from "react";
import type {
  ColDef,
  EditableCallbackParams,
  ValueGetterParams,
  ValueSetterParams,
} from "ag-grid-community";
import { useBulkEditorStore } from "./useBulkEditorStore";
import {
  IBulkEditorRow,
  ALL_COLUMNS,
  PRODUCT_COLUMNS,
  VARIANT_COLUMNS,
  VARIANT_FIELDS,
} from "../types";
import {
  TitleCellRenderer,
  ReservedCellRenderer,
  AvailableCellRenderer,
  ProductStatusRenderer,
  TextCellRenderer,
  NumberCellRenderer,
  PriceCellRenderer,
} from "../components/cell-renderers";

// Check if cell should be editable
function isCellEditable(
  params: EditableCallbackParams<IBulkEditorRow>
): boolean {
  const { data, colDef } = params;
  if (!data || !colDef?.field) return false;

  const column = ALL_COLUMNS.find((c) => c.field === colDef.field);
  if (!column || !column.editable) return false;

  const { rowType } = data;
  const isVariantColumn = VARIANT_FIELDS.has(column.field);

  // Single variant product: all columns editable
  if (rowType === "single-variant-product") return true;

  // Product row: only product columns editable
  if (rowType === "product") return !isVariantColumn;

  // Variant row: only variant columns editable
  if (rowType === "variant") return isVariantColumn;

  return false;
}

// Get value from store (edited) or data (original)
function createValueGetter(field: keyof IBulkEditorRow) {
  return (params: ValueGetterParams<IBulkEditorRow>) => {
    const { data } = params;
    if (!data) return null;

    const isVariantColumn = VARIANT_FIELDS.has(field);
    const showDash =
      (data.rowType === "product" && isVariantColumn) ||
      (data.rowType === "variant" && !isVariantColumn);

    if (showDash) return null;

    // Get edited value from store, or fall back to original
    const edit = useBulkEditorStore
      .getState()
      .getFieldEdit(data.id, field as string);

    return edit ? edit.currentValue : data[field];
  };
}

// Value setter - save to store
// Validation is done in handleSetFieldValue in BulkEditorGrid
function createValueSetter(field: keyof IBulkEditorRow) {
  return (params: ValueSetterParams<IBulkEditorRow>): boolean => {
    const { data, newValue } = params;
    if (!data) return false;

    const originalValue = data[field];

    useBulkEditorStore
      .getState()
      .setFieldValue(data.id, field as string, originalValue, newValue);

    return true;
  };
}

// Price fields
const PRICE_FIELDS = new Set(["price", "compareAtPrice", "costPrice"]);

// Get cell renderer based on column type and field
function getCellRenderer(column: (typeof ALL_COLUMNS)[0]) {
  // Special renderers for inventory fields
  if (column.field === "reserved") return ReservedCellRenderer;
  if (column.field === "available") return AvailableCellRenderer;

  switch (column.type) {
    case "badge":
      if (column.field === "productStatus") return ProductStatusRenderer;
      return undefined;
    case "number":
      if (PRICE_FIELDS.has(column.field)) return PriceCellRenderer;
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

// Get column type for alignment
function getColumnType(column: (typeof ALL_COLUMNS)[0]): string | undefined {
  switch (column.type) {
    case "number":
      return "rightAligned";
    default:
      return undefined;
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
      return { min: 0, precision: 2 };
    case "onHand":
    case "unavailable":
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
        type: getColumnType(col),
        editable: isCellEditable,
        cellRenderer: getCellRenderer(col),
        cellEditor: getCellEditor(col),
        cellEditorParams: getCellEditorParams(col),
        valueGetter: createValueGetter(col.field),
        valueSetter: createValueSetter(col.field),
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
        type: getColumnType(col),
        editable: col.editable ? isCellEditable : false,
        cellRenderer: getCellRenderer(col),
        cellEditor: getCellEditor(col),
        cellEditorParams: getCellEditorParams(col),
        valueGetter: createValueGetter(col.field),
        valueSetter: createValueSetter(col.field),
      });
    }

    return columns;
  }, [columnVisibility]);
}
