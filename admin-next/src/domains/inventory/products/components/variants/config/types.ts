import type { IEditorRowBase } from "@/shared/components/editor-grid";

// ============================================================================
// Variant Row Interface
// ============================================================================

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface IVariantOption {
  name: string;
  value: string;
}

export interface IVariantEditorRow extends IEditorRowBase {
  // Display
  title: string;
  imageUrl: string | null;

  // Options (dynamic, based on product options)
  options: IVariantOption[];

  // Inventory
  sku: string | null;
  barcode: string | null;
  stock: number;
  stockStatus: StockStatus;

  // Pricing
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;

  // Shipping
  weight: number | null;
  weightUnit: string;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: string;
}

// ============================================================================
// Column Configuration
// ============================================================================

export interface IVariantColumn {
  field: keyof IVariantEditorRow | string; // string for option columns
  headerName: string;
  defaultVisible: boolean;
  editable: boolean;
  width?: number;
  minWidth?: number;
  flex?: number;
  type?: "text" | "number" | "badge" | "option";
}

// ============================================================================
// Available Column Fields
// ============================================================================

export type VariantColumnField =
  | "sku"
  | "barcode"
  | "price"
  | "compareAtPrice"
  | "costPrice"
  | "stock"
  | "stockStatus"
  | "weight"
  | "length"
  | "width"
  | "height";

// ============================================================================
// Option Group (for dynamic columns)
// ============================================================================

export interface IOptionGroup {
  name: string;
  values: string[];
}
