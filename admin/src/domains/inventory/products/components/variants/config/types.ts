import type { IEditorRowBase } from "@/shared/components/editor-grid/types";

// ============================================================================
// Variant Row Interface
// ============================================================================

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface IVariantOption {
  name: string;
  value: string;
}

export interface IVariantEditorInput {
  id: string;
  title: string;
  imageUrl?: string | null;
  media?: string[] | null;
  options?: IVariantOption[];
  sku?: string | null;
  barcode?: string | null;
  onHand?: number;
  unavailable?: number;
  reserved?: number;
  price?: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  weight?: number | null;
  weightUnit?: string;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimensionUnit?: string;
}

export interface IVariantEditorRow extends IEditorRowBase {
  // Display
  title: string;
  imageUrl: string | null;
  media: string[] | null;

  // Options (dynamic, based on product options)
  options: IVariantOption[];

  // Inventory identification
  sku: string | null;
  barcode: string | null;

  // Inventory quantities (same model as inventory table)
  onHand: number;
  unavailable: number;
  reserved: number;
  available: number; // calculated: onHand - unavailable - reserved

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
  type?: "text" | "number" | "badge" | "option" | "media";
}

// ============================================================================
// Available Column Fields
// ============================================================================

export type VariantColumnField =
  | "media"
  | "sku"
  | "barcode"
  | "price"
  | "compareAtPrice"
  | "costPrice"
  | "onHand"
  | "unavailable"
  | "reserved"
  | "available"
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
