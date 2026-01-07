import { IBulkEditorRow, BulkEditorRowType, IRowEdits } from "../types";
import { IMockProduct, IMockVariant } from "../mocks/bulk-editor-data";

const LOW_STOCK_THRESHOLD = 10;

function getStockStatus(
  stock: number
): "in_stock" | "low_stock" | "out_of_stock" {
  if (stock <= 0) return "out_of_stock";
  if (stock <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

function createProductRow(
  product: IMockProduct,
  rowType: BulkEditorRowType,
  variant?: IMockVariant
): IBulkEditorRow {
  const isSingleVariant = rowType === "single-variant-product";
  const v = isSingleVariant ? variant : null;

  return {
    id: isSingleVariant ? `${product.id}-${variant!.id}` : product.id,
    rowType,
    productId: product.id,
    variantId: isSingleVariant ? variant!.id : null,
    path: [product.id],
    title: product.title,
    imageUrl: product.imageUrl,

    // Product fields
    productTitle: product.title,
    productDescription: product.description,
    productStatus: product.status,
    productCategory: product.category,
    productBrand: product.brand,
    productTags: product.tags,

    // Variant fields (only for single variant)
    sku: v?.sku ?? null,
    barcode: v?.barcode ?? null,
    price: v?.price ?? null,
    compareAtPrice: v?.compareAtPrice ?? null,
    costPrice: v?.costPrice ?? null,
    stock: v?.stock ?? null,
    stockStatus: v ? getStockStatus(v.stock) : null,
    weight: v?.weight ?? null,
    weightUnit: v?.weightUnit ?? null,
    length: v?.length ?? null,
    width: v?.width ?? null,
    height: v?.height ?? null,
    dimensionUnit: v?.dimensionUnit ?? null,
  };
}

function createVariantRow(
  product: IMockProduct,
  variant: IMockVariant
): IBulkEditorRow {
  return {
    id: `${product.id}-${variant.id}`,
    rowType: "variant",
    productId: product.id,
    variantId: variant.id,
    path: [product.id, variant.id],
    title: variant.title,
    imageUrl: variant.imageUrl ?? product.imageUrl,

    // Product fields (null for variant rows)
    productTitle: null,
    productDescription: null,
    productStatus: null,
    productCategory: null,
    productBrand: null,
    productTags: null,

    // Variant fields
    sku: variant.sku,
    barcode: variant.barcode,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    costPrice: variant.costPrice,
    stock: variant.stock,
    stockStatus: getStockStatus(variant.stock),
    weight: variant.weight,
    weightUnit: variant.weightUnit,
    length: variant.length,
    width: variant.width,
    height: variant.height,
    dimensionUnit: variant.dimensionUnit,
  };
}

export function transformProductsToRows(
  products: IMockProduct[]
): IBulkEditorRow[] {
  const rows: IBulkEditorRow[] = [];

  for (const product of products) {
    const isSingleVariant = product.variants.length === 1;

    if (isSingleVariant) {
      // Single variant: create one row with all columns active
      rows.push(
        createProductRow(product, "single-variant-product", product.variants[0])
      );
    } else {
      // Multi-variant: create product row + variant rows
      rows.push(createProductRow(product, "product"));

      for (const variant of product.variants) {
        rows.push(createVariantRow(product, variant));
      }
    }
  }

  return rows;
}

// Apply edits to rows for display
export function applyEditsToRows(
  rows: IBulkEditorRow[],
  edits: Record<string, IRowEdits>
): IBulkEditorRow[] {
  return rows.map((row) => {
    const rowEdits = edits[row.id];
    if (!rowEdits) return row;

    const updatedRow = { ...row };
    for (const [field, edit] of Object.entries(rowEdits)) {
      (updatedRow as Record<string, unknown>)[field] = edit.currentValue;

      // Recalculate stock status if stock changed
      if (field === "stock" && typeof edit.currentValue === "number") {
        updatedRow.stockStatus = getStockStatus(edit.currentValue);
      }
    }

    return updatedRow;
  });
}

// Format price for display (in kopecks to rubles with kopecks, dot separator)
export function formatPrice(value: number | null): string | null {
  if (value === null) return null;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    currency: "RUB",
    currencySign: "standard",
    currencyDisplay: "narrowSymbol",
  }).format(value * 0.01);
}

// Parse price input (rubles to kopecks)
export function parsePrice(value: string): number | null {
  const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num * 100);
}
