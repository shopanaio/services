import type { IEditorRowBase } from "@/shared/components/editor-grid/types";
import type { ApiFile } from "@/graphql/types";

// ============================================================================
// Variant Row Interface
// ============================================================================

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface IVariantOption {
  optionId?: string;
  optionValueId?: string;
  name: string;
  value: string;
}

export interface IVariantEditorInput {
  id: string;
  title: string;
  imageUrl?: string | null;
  media?: ApiFile[] | null;
  options?: IVariantOption[];
  selectedOptionValueIds?: Record<string, string | null>;
  sku?: string | null;
  onHand?: number;
  unavailable?: number;
  reserved?: number;
  price?: number | null;
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
  media: ApiFile[];

  // Options (dynamic, based on product options)
  options: IVariantOption[];
  selectedOptionValueIds: Record<string, string | null>;

  // Inventory identification
  sku: string | null;

  // Inventory quantities (same model as inventory table)
  onHand: number;
  unavailable: number;
  reserved: number;
  available: number; // calculated: onHand - unavailable - reserved

  // Pricing
  price: number | null;
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

export interface VariantOptionRowsValidationResult {
  rows: IVariantEditorRow[];
  hasErrors: boolean;
  duplicateRowIds: string[];
  incompleteRowIds: string[];
  invalidRowIds: string[];
  messages: string[];
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
