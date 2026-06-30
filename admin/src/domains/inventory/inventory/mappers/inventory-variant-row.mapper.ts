import type { ApiInventoryItemEdge } from "@/graphql/types";

export interface InventoryVariantRow {
  id: string;
  variantId: string;
  productId: string;
  productRevision: number;
  productTitle: string;
  productHandle: string | null;
  variantTitle: string | null;
  variantHandle: string;
  isDefault: boolean;
  imageUrl: string | null;
  sku: string | null;
  inventoryItemId: string | null;
  warehouseStockId: string | null;
  warehouseId: string | null;
  onHand: number;
  unavailable: number;
  reserved: number;
  available: number;
  trackInventory: boolean;
  continueSellingWhenOutOfStock: boolean;
  cursor: string;
  readOnly: boolean;
  readOnlyReason: string | null;
}

function getPrimaryImageUrl(edge: ApiInventoryItemEdge): string | null {
  const primaryMedia = edge.node.variant.media.reduce<
    ApiInventoryItemEdge["node"]["variant"]["media"][number] | null
  >((current, item) => {
    if (!current) {
      return item;
    }

    return item.sortIndex < current.sortIndex ? item : current;
  }, null);

  return primaryMedia?.file.url ?? null;
}

function sumStockField(
  stock: ApiInventoryItemEdge["node"]["stock"],
  field:
    | "quantityOnHand"
    | "unavailableQuantity"
    | "reservedQuantity"
    | "availableForSale",
) {
  return stock.reduce((total, item) => total + item[field], 0);
}

export function mapInventoryVariantEdgeToRow(
  edge: ApiInventoryItemEdge,
  warehouseId: string | null,
): InventoryVariantRow {
  const inventoryItem = edge.node;
  const variant = inventoryItem.variant;
  const selectedStock = warehouseId
    ? inventoryItem.stock.find((stock) => stock.warehouseId === warehouseId) ??
      null
    : null;

  const onHand = selectedStock
    ? selectedStock.quantityOnHand
    : sumStockField(inventoryItem.stock, "quantityOnHand");
  const unavailable = selectedStock
    ? selectedStock.unavailableQuantity
    : sumStockField(inventoryItem.stock, "unavailableQuantity");
  const reserved = selectedStock
    ? selectedStock.reservedQuantity
    : sumStockField(inventoryItem.stock, "reservedQuantity");
  const available = selectedStock
    ? selectedStock.availableForSale
    : inventoryItem.totalAvailable;

  const readOnlyReason = !warehouseId
    ? "Select a warehouse to edit inventory."
    : null;

  return {
    id: inventoryItem.id,
    variantId: variant.id,
    productId: variant.product.id,
    productRevision: variant.product.revision,
    productTitle: variant.product.title,
    productHandle: variant.product.handle ?? null,
    variantTitle: variant.title ?? null,
    variantHandle: variant.handle,
    isDefault: variant.isDefault,
    imageUrl: getPrimaryImageUrl(edge),
    sku: inventoryItem.sku ?? null,
    inventoryItemId: inventoryItem.id,
    warehouseStockId: selectedStock?.id ?? null,
    warehouseId: selectedStock?.warehouseId ?? warehouseId,
    onHand,
    unavailable,
    reserved,
    available,
    trackInventory: inventoryItem.trackInventory,
    continueSellingWhenOutOfStock:
      inventoryItem.continueSellingWhenOutOfStock,
    cursor: edge.cursor,
    readOnly: Boolean(readOnlyReason),
    readOnlyReason,
  };
}

export function mapInventoryVariantEdgesToRows(
  edges: ApiInventoryItemEdge[],
  warehouseId: string | null,
): InventoryVariantRow[] {
  return edges.map((edge) =>
    mapInventoryVariantEdgeToRow(edge, warehouseId),
  );
}
