import { IBulkEditorRow, BulkEditorRowType, IRowEdits } from "../types";
import { IMockProduct, IMockVariant } from "@/mocks/products/bulk-editor";

/**
 * Calculate available inventory: onHand - unavailable - reserved
 */
function calculateAvailable(
  onHand: number,
  unavailable: number,
  reserved: number
): number {
  return onHand - unavailable - reserved;
}

function createProductRow(
  product: IMockProduct,
  rowType: BulkEditorRowType,
  variant?: IMockVariant
): IBulkEditorRow {
  const isSingleVariant = rowType === "single-variant-product";
  const v = isSingleVariant ? variant : null;

  // Calculate available for single variant products
  const onHand = v?.onHand ?? null;
  const unavailable = v?.unavailable ?? null;
  const reserved = v?.reserved ?? null;
  const available =
    onHand !== null && unavailable !== null && reserved !== null
      ? calculateAvailable(onHand, unavailable, reserved)
      : null;

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
    productExcerpt: product.excerpt ?? null,
    productStatus: product.status,
    productCategory: product.category,
    productBrand: product.brand,
    productTags: product.tags,
    productMedia: product.media ?? null,

    // Variant fields (only for single variant)
    sku: v?.sku ?? null,
    barcode: v?.barcode ?? null,
    price: v?.price ?? null,
    compareAtPrice: v?.compareAtPrice ?? null,
    costPrice: v?.costPrice ?? null,
    onHand,
    unavailable,
    reserved,
    available,
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
  const onHand = variant.onHand;
  const unavailable = variant.unavailable;
  const reserved = variant.reserved;
  const available = calculateAvailable(onHand, unavailable, reserved);

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
    productExcerpt: null,
    productStatus: null,
    productCategory: null,
    productBrand: null,
    productTags: null,
    productMedia: null,

    // Variant fields
    sku: variant.sku,
    barcode: variant.barcode,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    costPrice: variant.costPrice,
    onHand,
    unavailable,
    reserved,
    available,
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
    }

    // Recalculate available if any inventory field was edited
    if (rowEdits.onHand || rowEdits.unavailable) {
      const onHand = updatedRow.onHand ?? 0;
      const unavailable = updatedRow.unavailable ?? 0;
      const reserved = updatedRow.reserved ?? 0;
      updatedRow.available = calculateAvailable(onHand, unavailable, reserved);
    }

    return updatedRow;
  });
}

