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
  productStatus: "published" | "draft" | null;
  productCategory: string | null;
  productBrand: string | null;
  productTags: string[] | null;

  // Variant-level fields (editable for variant rows & single-variant)
  sku: string | null;
  barcode: string | null;
  price: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;
  stock: number | null;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock" | null;
  weight: number | null;
  weightUnit: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: string | null;
}

// Column categories
export type ColumnCategory = "product" | "variant";

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
  type?: "text" | "number" | "currency" | "select" | "tags" | "badge";
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
    field: "productDescription",
    headerName: "Description",
    category: "product",
    defaultVisible: false,
    editable: true,
    flex: 1,
    minWidth: 150,
    type: "text",
  },
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
    flex: 1,
    minWidth: 150,
    type: "tags",
  },
];

export const VARIANT_COLUMNS: IBulkEditorColumn[] = [
  {
    field: "sku",
    headerName: "SKU",
    category: "variant",
    defaultVisible: true,
    editable: true,
    width: 120,
    type: "text",
  },
  {
    field: "barcode",
    headerName: "Barcode",
    category: "variant",
    defaultVisible: false,
    editable: true,
    width: 140,
    type: "text",
  },
  {
    field: "price",
    headerName: "Price",
    category: "variant",
    defaultVisible: true,
    editable: true,
    width: 120,
    type: "currency",
  },
  {
    field: "compareAtPrice",
    headerName: "Compare at",
    category: "variant",
    defaultVisible: false,
    editable: true,
    width: 130,
    type: "currency",
  },
  {
    field: "costPrice",
    headerName: "Cost",
    category: "variant",
    defaultVisible: false,
    editable: true,
    width: 110,
    type: "currency",
  },
  {
    field: "stock",
    headerName: "Stock",
    category: "variant",
    defaultVisible: true,
    editable: true,
    width: 100,
    type: "number",
  },
  {
    field: "stockStatus",
    headerName: "Availability",
    category: "variant",
    defaultVisible: true,
    editable: false,
    width: 120,
    type: "badge",
  },
  {
    field: "weight",
    headerName: "Weight",
    category: "variant",
    defaultVisible: false,
    editable: true,
    width: 100,
    type: "number",
  },
  {
    field: "weightUnit",
    headerName: "W. Unit",
    category: "variant",
    defaultVisible: false,
    editable: true,
    width: 80,
    type: "select",
  },
  {
    field: "length",
    headerName: "Length",
    category: "variant",
    defaultVisible: false,
    editable: true,
    width: 90,
    type: "number",
  },
  {
    field: "width",
    headerName: "Width",
    category: "variant",
    defaultVisible: false,
    editable: true,
    width: 90,
    type: "number",
  },
  {
    field: "height",
    headerName: "Height",
    category: "variant",
    defaultVisible: false,
    editable: true,
    width: 90,
    type: "number",
  },
  {
    field: "dimensionUnit",
    headerName: "D. Unit",
    category: "variant",
    defaultVisible: false,
    editable: true,
    width: 80,
    type: "select",
  },
];

export const ALL_COLUMNS = [...PRODUCT_COLUMNS, ...VARIANT_COLUMNS];

// Default column visibility
export const DEFAULT_COLUMN_VISIBILITY: IColumnVisibility = ALL_COLUMNS.reduce(
  (acc, col) => ({
    ...acc,
    [col.field]: col.defaultVisible,
  }),
  {} as IColumnVisibility
);
