import type { CatalogProductAvailabilitySnapshot } from "@shopana/broker-types";
import { ServiceType } from "./ServiceType.js";

export type CatalogProductAvailabilitySnapshotInput =
  | { productId: string }
  | { variantId: string };

export class CatalogProductAvailabilitySnapshotResolver extends ServiceType<
  CatalogProductAvailabilitySnapshotInput,
  CatalogProductAvailabilitySnapshot
> {
  protected async $preload(): Promise<CatalogProductAvailabilitySnapshot> {
    const variantIds =
      "variantId" in this.$props
        ? [this.$props.variantId]
        : await this.$ctx.loaders.variantIds.load(this.$props.productId);

    const availability = await Promise.all(
      variantIds.map(async (variantId) => {
        const [stockItems, inventoryItem] = await Promise.all([
          this.$ctx.loaders.stockByVariant.load(variantId),
          this.$ctx.loaders.inventoryItemByVariant.load(variantId),
        ]);
        const totalQuantity = stockItems.reduce(
          (total, stock) =>
            total +
            stock.quantityOnHand -
            stock.reservedQty -
            stock.unavailableQty,
          0
        );

        return {
          availableForSale:
            totalQuantity > 0 ||
            !!inventoryItem?.continueSellingWhenOutOfStock,
          totalQuantity,
        };
      })
    );

    return {
      availableForSale: availability.some((item) => item.availableForSale),
      totalQuantity: availability.reduce(
        (total, item) => total + (item.totalQuantity ?? 0),
        0
      ),
    };
  }

  async availableForSale(): Promise<boolean> {
    return this.$get("availableForSale");
  }

  async totalQuantity(): Promise<number | null> {
    return (await this.$get("totalQuantity")) ?? null;
  }

  async $snapshot() {
    return this.$data;
  }
}
