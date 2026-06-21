import type { ApiVariantEdge, ApiWarehouse } from "@/graphql/types";

export interface InventoryVariantRow {
  id: string;
  variantId: string;
  productId: string;
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

type DefaultWarehouse = Pick<ApiWarehouse, "id"> | null;

function getPrimaryImageUrl(edge: ApiVariantEdge): string | null {
  const primaryMedia = edge.node.media.reduce<
    ApiVariantEdge["node"]["media"][number] | null
  >((current, item) => {
    if (!current) {
      return item;
    }

    return item.sortIndex < current.sortIndex ? item : current;
  }, null);

  return primaryMedia?.file.url ?? null;
}

export function mapInventoryVariantEdgeToRow(
  edge: ApiVariantEdge,
  defaultWarehouse: DefaultWarehouse,
): InventoryVariantRow {
  const variant = edge.node;
  const inventoryItem = variant.inventoryItem ?? null;
  const selectedStock = defaultWarehouse
    ? inventoryItem?.stock.find((stock) => stock.warehouseId === defaultWarehouse.id) ??
      null
    : null;

  const onHand = selectedStock?.quantityOnHand ?? 0;
  const unavailable = selectedStock?.unavailableQuantity ?? 0;
  const reserved = selectedStock?.reservedQuantity ?? 0;
  const available = selectedStock?.availableForSale ?? onHand - unavailable - reserved;

  const readOnlyReason = !defaultWarehouse
    ? "Default warehouse is not configured"
    : !inventoryItem?.id
      ? "Inventory item is missing"
      : null;

  return {
    id: variant.id,
    variantId: variant.id,
    productId: variant.product.id,
    productTitle: variant.product.title,
    productHandle: variant.product.handle ?? null,
    variantTitle: variant.title ?? null,
    variantHandle: variant.handle,
    isDefault: variant.isDefault,
    imageUrl: getPrimaryImageUrl(edge),
    sku: inventoryItem?.sku ?? null,
    inventoryItemId: inventoryItem?.id ?? null,
    warehouseStockId: selectedStock?.id ?? null,
    warehouseId: selectedStock?.warehouseId ?? defaultWarehouse?.id ?? null,
    onHand,
    unavailable,
    reserved,
    available,
    trackInventory: inventoryItem?.trackInventory ?? false,
    continueSellingWhenOutOfStock:
      inventoryItem?.continueSellingWhenOutOfStock ?? false,
    cursor: edge.cursor,
    readOnly: Boolean(readOnlyReason),
    readOnlyReason,
  };
}

export function mapInventoryVariantEdgesToRows(
  edges: ApiVariantEdge[],
  defaultWarehouse: DefaultWarehouse,
): InventoryVariantRow[] {
  return edges.map((edge) => mapInventoryVariantEdgeToRow(edge, defaultWarehouse));
}
