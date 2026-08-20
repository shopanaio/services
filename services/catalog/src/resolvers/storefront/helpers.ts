import type { ServiceContext } from "../../context/types.js";
import type { InventoryItem, Product, Variant } from "../../repositories/models/index.js";

export function isPublishedProduct(
  product: Product | null | undefined,
  now = Date.now(),
): product is Product {
  return Boolean(
    product && !product.deletedAt && product.publishedAt && Date.parse(product.publishedAt) <= now,
  );
}

export function isPublishedAt(value: string | null | undefined): value is string {
  return Boolean(value && Date.parse(value) <= Date.now());
}

export async function loadPublishedVariant(
  ctx: ServiceContext,
  variantId: string,
): Promise<Variant | null> {
  const variant = await ctx.loaders.variant.load(variantId);
  if (!variant) return null;
  const product = await ctx.loaders.product.load(variant.productId);
  return isPublishedProduct(product) ? variant : null;
}

export async function inventoryState(
  ctx: ServiceContext,
  variantId: string,
): Promise<{
  item: InventoryItem | null;
  quantityAvailable: number | null;
  availableForSale: boolean;
  currentlyNotInStock: boolean;
}> {
  const item = await ctx.loaders.inventoryItemByVariant.load(variantId);
  if (!item) {
    return {
      item: null,
      quantityAvailable: null,
      availableForSale: true,
      currentlyNotInStock: false,
    };
  }

  if (!item.trackInventory) {
    return {
      item,
      quantityAvailable: null,
      availableForSale: true,
      currentlyNotInStock: false,
    };
  }

  const stocks = await ctx.loaders.stockByVariant.load(variantId);
  const quantityAvailable = Math.max(
    0,
    stocks.reduce(
      (sum, stock) => sum + stock.quantityOnHand - stock.reservedQty - stock.unavailableQty,
      0,
    ),
  );
  const availableForSale = quantityAvailable > 0 || item.continueSellingWhenOutOfStock;

  return {
    item,
    quantityAvailable,
    availableForSale,
    currentlyNotInStock: availableForSale && quantityAvailable === 0,
  };
}
