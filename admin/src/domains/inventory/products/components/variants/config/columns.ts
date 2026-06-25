import type { IVariantColumn, IOptionGroup } from "./types";

// ============================================================================
// Variant Columns Configuration (grouped like bulk editor)
// ============================================================================

export const MEDIA_COLUMNS: IVariantColumn[] = [
  {
    field: "media",
    headerName: "Variant Media",
    defaultVisible: true,
    editable: true,
    width: 120,
    minWidth: 80,
    type: "media",
  },
];

export const PRICING_COLUMNS: IVariantColumn[] = [
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
];

export const INVENTORY_COLUMNS: IVariantColumn[] = [
  {
    field: "sku",
    headerName: "SKU",
    defaultVisible: true,
    editable: true,
    width: 150,
    minWidth: 150,
    type: "text",
  },
  {
    field: "onHand",
    headerName: "On hand",
    defaultVisible: true,
    editable: true,
    width: 100,
    type: "number",
  },
  {
    field: "unavailable",
    headerName: "Unavailable",
    defaultVisible: true,
    editable: true,
    width: 110,
    type: "number",
  },
  {
    field: "reserved",
    headerName: "Reserved",
    defaultVisible: true,
    editable: false, // managed by order system
    width: 100,
    type: "number",
  },
  {
    field: "available",
    headerName: "Available",
    defaultVisible: true,
    editable: false, // calculated
    width: 100,
    type: "number",
  },
];

export const ATTRIBUTES_COLUMNS: IVariantColumn[] = [
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

// Combined for backwards compatibility
export const VARIANT_COLUMNS: IVariantColumn[] = [
  ...PRICING_COLUMNS,
  ...ATTRIBUTES_COLUMNS,
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
  "media",
  "price",
  "compareAtPrice",
  "weight",
  "length",
  "width",
  "height",
];
