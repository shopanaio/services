import React, { useMemo } from "react";
import type { ColDef, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { useVariantsEditorStore } from "./useVariantsEditorStore";
import {
  VARIANT_COLUMNS,
  createOptionColumns,
  type IVariantEditorRow,
  type IOptionGroup,
} from "../config";
import {
  ImageCellRenderer,
  TitleCellRenderer,
  StockStatusRenderer,
  TextCellRenderer,
  NumberCellRenderer,
  PriceCellRenderer,
} from "../components/cell-renderers";

// ============================================================================
// Price fields
// ============================================================================

const PRICE_FIELDS = new Set(["price", "compareAtPrice", "costPrice"]);

// ============================================================================
// Get cell renderer based on column type
// ============================================================================

function getCellRenderer(type?: string) {
  switch (type) {
    case "badge":
      return StockStatusRenderer;
    case "number":
      return NumberCellRenderer;
    case "text":
      return TextCellRenderer;
    default:
      return undefined;
  }
}

// ============================================================================
// Get cell editor based on column type
// ============================================================================

function getCellEditor(type?: string) {
  switch (type) {
    case "number":
      return "agNumberCellEditor";
    case "text":
      return "agTextCellEditor";
    default:
      return "agTextCellEditor";
  }
}

// ============================================================================
// Get column alignment type
// ============================================================================

function getColumnType(type?: string): string | undefined {
  switch (type) {
    case "number":
      return "rightAligned";
    default:
      return undefined;
  }
}

// ============================================================================
// Get cell editor params
// ============================================================================

function getCellEditorParams(field: string) {
  switch (field) {
    case "price":
    case "compareAtPrice":
    case "costPrice":
      return { min: 0, precision: 2 };
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

// ============================================================================
// Value getter - get value from store (edited) or data (original)
// ============================================================================

function createValueGetter(field: string) {
  return (params: ValueGetterParams<IVariantEditorRow>) => {
    const { data } = params;
    if (!data) return null;

    // Get edited value from store, or fall back to original
    const edit = useVariantsEditorStore
      .getState()
      .getFieldEdit(data.id, field);

    return edit ? edit.currentValue : (data as unknown as Record<string, unknown>)[field];
  };
}

// ============================================================================
// Value setter - save to store
// ============================================================================

function createValueSetter(field: string) {
  return (params: ValueSetterParams<IVariantEditorRow>): boolean => {
    const { data, newValue } = params;
    if (!data) return false;

    const originalValue = (data as unknown as Record<string, unknown>)[field];

    useVariantsEditorStore
      .getState()
      .setFieldValue(data.id, field, originalValue, newValue);

    return true;
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useVariantsColumns(
  optionGroups: IOptionGroup[]
): ColDef<IVariantEditorRow>[] {
  const columnVisibility = useVariantsEditorStore((s) => s.columnVisibility);
  const isOptionColumnVisible = useVariantsEditorStore(
    (s) => s.isOptionColumnVisible
  );

  return useMemo(() => {
    const columns: ColDef<IVariantEditorRow>[] = [];

    // Fixed: Image column
    columns.push({
      field: "imageUrl",
      headerName: "Image",
      width: 72,
      cellRenderer: ImageCellRenderer,
      pinned: "left",
      sortable: false,
      resizable: false,
    });

    // Fixed: Title column
    columns.push({
      field: "title",
      headerName: "Variant",
      flex: 1,
      minWidth: 200,
      cellRenderer: TitleCellRenderer,
      pinned: "left",
    });

    // Option columns (dynamic)
    const optionCols = createOptionColumns(optionGroups);
    for (const col of optionCols) {
      if (!isOptionColumnVisible(col.headerName)) continue;

      const optionName = col.headerName;
      columns.push({
        colId: col.field,
        headerName: col.headerName,
        width: col.width,
        minWidth: col.minWidth,
        valueGetter: (params) => {
          const option = params.data?.options.find((o) => o.name === optionName);
          return option?.value ?? "";
        },
      });
    }

    // Variant columns
    for (const col of VARIANT_COLUMNS) {
      if (!columnVisibility[col.field]) continue;

      // Use price renderer for price fields
      const cellRenderer = PRICE_FIELDS.has(col.field)
        ? PriceCellRenderer
        : getCellRenderer(col.type);

      columns.push({
        field: col.field as keyof IVariantEditorRow,
        headerName: col.headerName,
        width: col.width,
        minWidth: col.minWidth,
        flex: col.flex,
        type: getColumnType(col.type),
        editable: col.editable,
        cellRenderer,
        cellEditor: getCellEditor(col.type),
        cellEditorParams: getCellEditorParams(col.field),
        valueGetter: createValueGetter(col.field),
        valueSetter: createValueSetter(col.field),
      });
    }

    return columns;
  }, [columnVisibility, optionGroups, isOptionColumnVisible]);
}
