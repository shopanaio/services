// Row type discriminator
export type BulkEditorRowType =
  | "product"
  | "variant"
  | "single-variant-product";

// Base row interface
export interface IBulkEditorRow {
  id: string;
  rowType: BulkEditorRowType;
  productId: string;
  variantId: string | null;

  // Hierarchy for AG Grid tree data
  path: string[];

  // Display
  title: string;
  imageUrl: string | null;

  // Product-level fields (editable for product rows & single-variant)
  productTitle: string | null;
  productDescription: string | null;
  productExcerpt: string | null;
  productStatus: "published" | "draft" | null;
  productCategory: string | null;
  productBrand: string | null;
  productTags: string[] | null;
  productMedia: string[] | null;

  // Variant-level fields (editable for variant rows & single-variant)
  sku: string | null;
  barcode: string | null;
  price: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;

  // Inventory quantities (same model as inventory table)
  onHand: number | null;
  unavailable: number | null;
  reserved: number | null;
  available: number | null; // calculated: onHand - unavailable - reserved

  weight: number | null;
  weightUnit: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: string | null;
}

// Column categories
export type ColumnCategory = "product" | "pricing" | "inventory" | "attributes";

// Column definition with metadata
export interface IBulkEditorColumn {
  field: keyof IBulkEditorRow;
  headerName: string;
  category: ColumnCategory;
  defaultVisible: boolean;
  editable: boolean;
  width?: number;
  minWidth?: number;
  flex?: number;
  type?: "text" | "number" | "select" | "tags" | "badge" | "media";
}

// Column visibility state
export interface IColumnVisibility {
  [field: string]: boolean;
}

// Edit tracking
export interface IFieldEdit<T = unknown> {
  originalValue: T;
  currentValue: T;
}

export interface IRowEdits {
  [field: string]: IFieldEdit;
}

// Store state
export interface IBulkEditorState {
  selectedProductIds: string[];
  edits: Record<string, IRowEdits>;
  columnVisibility: IColumnVisibility;
  status: "idle" | "saving";
  isOpen: boolean;
}

// Column definitions
export const PRODUCT_COLUMNS: IBulkEditorColumn[] = [
  {
    field: "productStatus",
    headerName: "Status",
    category: "product",
    defaultVisible: true,
    editable: true,
    width: 120,
    type: "select",
  },
  {
    field: "productDescription",
    headerName: "Description",
    category: "product",
    defaultVisible: false,
    editable: true,
    width: 200,
    type: "text",
  },
  {
    field: "productExcerpt",
    headerName: "Excerpt",
    category: "product",
    defaultVisible: false,
    editable: true,
    width: 200,
    type: "text",
  },
  {
    field: "productCategory",
    headerName: "Category",
    category: "product",
    defaultVisible: false,
    editable: true,
    width: 140,
    type: "select",
  },
  {
    field: "productBrand",
    headerName: "Brand",
    category: "product",
    defaultVisible: false,
    editable: true,
    width: 140,
    type: "select",
  },
  {
    field: "productTags",
    headerName: "Tags",
    category: "product",
    defaultVisible: false,
    editable: true,
    width: 150,
    type: "tags",
  },
  {
    field: "productMedia",
    headerName: "Product Media",
    category: "product",
    defaultVisible: false,
    editable: false,
    width: 120,
    type: "media",
  },
];

export const PRICING_COLUMNS: IBulkEditorColumn[] = [
  {
    field: "price",
    headerName: "Price",
    category: "pricing",
    defaultVisible: true,
    editable: true,
    width: 120,
    type: "number",
  },
  {
    field: "compareAtPrice",
    headerName: "Compare at",
    category: "pricing",
    defaultVisible: false,
    editable: true,
    width: 130,
    type: "number",
  },
];

export const INVENTORY_COLUMNS: IBulkEditorColumn[] = [];

export const ATTRIBUTES_COLUMNS: IBulkEditorColumn[] = [
  {
    field: "weight",
    headerName: "Weight",
    category: "attributes",
    defaultVisible: false,
    editable: true,
    width: 100,
    type: "number",
  },
  {
    field: "length",
    headerName: "Length",
    category: "attributes",
    defaultVisible: false,
    editable: true,
    width: 90,
    type: "number",
  },
  {
    field: "width",
    headerName: "Width",
    category: "attributes",
    defaultVisible: false,
    editable: true,
    width: 90,
    type: "number",
  },
  {
    field: "height",
    headerName: "Height",
    category: "attributes",
    defaultVisible: false,
    editable: true,
    width: 90,
    type: "number",
  },
];

export const ALL_COLUMNS = [
  ...PRODUCT_COLUMNS,
  ...PRICING_COLUMNS,
  ...ATTRIBUTES_COLUMNS,
];

// Variant field names - used for determining cell editability and display
export const VARIANT_FIELDS = new Set<keyof IBulkEditorRow>([
  "sku",
  "barcode",
  "price",
  "compareAtPrice",
  "costPrice",
  "onHand",
  "unavailable",
  "reserved",
  "available",
  "weight",
  "weightUnit",
  "length",
  "width",
  "height",
  "dimensionUnit",
]);

// Check if a cell should show dash (not applicable for this row type)
export function shouldShowDash(
  rowType: BulkEditorRowType,
  field: keyof IBulkEditorRow
): boolean {
  const isVariantField = VARIANT_FIELDS.has(field);
  return (
    (rowType === "product" && isVariantField) ||
    (rowType === "variant" && !isVariantField)
  );
}

// Format price for display
export function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Default column visibility
export const DEFAULT_COLUMN_VISIBILITY: IColumnVisibility = ALL_COLUMNS.reduce(
  (acc, col) => ({
    ...acc,
    [col.field]: col.defaultVisible,
  }),
  {} as IColumnVisibility
);
