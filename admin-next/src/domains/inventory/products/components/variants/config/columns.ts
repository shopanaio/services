import type { IVariantColumn, IOptionGroup } from "./types";

// ============================================================================
// Variant Columns Configuration
// Same as bulk editor VARIANT_COLUMNS
// ============================================================================

export const VARIANT_COLUMNS: IVariantColumn[] = [
  {
    field: "sku",
    headerName: "SKU",
    defaultVisible: true,
    editable: true,
    width: 120,
    type: "text",
  },
  {
    field: "barcode",
    headerName: "Barcode",
    defaultVisible: false,
    editable: true,
    width: 140,
    type: "text",
  },
  {
    field: "price",
    headerName: "Price",
    defaultVisible: true,
    editable: true,
    width: 120,
    type: "number",
  },
  {
    field: "compareAtPrice",
    headerName: "Compare at",
    defaultVisible: false,
    editable: true,
    width: 130,
    type: "number",
  },
  {
    field: "costPrice",
    headerName: "Cost",
    defaultVisible: false,
    editable: true,
    width: 110,
    type: "number",
  },
  {
    field: "stock",
    headerName: "Stock",
    defaultVisible: true,
    editable: true,
    width: 100,
    type: "number",
  },
  {
    field: "stockStatus",
    headerName: "Availability",
    defaultVisible: true,
    editable: false,
    width: 120,
    type: "badge",
  },
  {
    field: "weight",
    headerName: "Weight",
    defaultVisible: false,
    editable: true,
    width: 100,
    type: "number",
  },
  {
    field: "length",
    headerName: "Length",
    defaultVisible: false,
    editable: true,
    width: 90,
    type: "number",
  },
  {
    field: "width",
    headerName: "Width",
    defaultVisible: false,
    editable: true,
    width: 90,
    type: "number",
  },
  {
    field: "height",
    headerName: "Height",
    defaultVisible: false,
    editable: true,
    width: 90,
    type: "number",
  },
];

// ============================================================================
// Option Columns Generator
// ============================================================================

export function createOptionColumns(optionGroups: IOptionGroup[]): IVariantColumn[] {
  return optionGroups.map((group) => ({
    field: `option_${group.name}`,
    headerName: group.name,
    defaultVisible: true,
    editable: false,
    width: 100,
    minWidth: 80,
    type: "option" as const,
  }));
}

// ============================================================================
// Selectable Columns (for cell selection)
// ============================================================================

export const SELECTABLE_COLUMNS = [
  "price",
  "compareAtPrice",
  "costPrice",
  "stock",
  "sku",
  "barcode",
  "weight",
  "length",
  "width",
  "height",
];
