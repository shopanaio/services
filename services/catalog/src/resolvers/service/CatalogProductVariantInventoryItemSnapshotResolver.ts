import type { CatalogProductVariantInventoryItemSnapshot } from "@shopana/broker-types";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductVariantInventoryItemSnapshotResolver extends ServiceType<
  string,
  CatalogProductVariantInventoryItemSnapshot
> {
  protected async $preload(): Promise<CatalogProductVariantInventoryItemSnapshot> {
    const inventoryItem = await this.$ctx.loaders.inventoryItemByVariant.load(
      this.$props
    );
    if (!inventoryItem) {
      throw new PreloadNotFoundError(
        `Inventory item for variant ${this.$props} not found`
      );
    }

    return {
      id: inventoryItem.id,
      sku: inventoryItem.sku,
    };
  }

  async id(): Promise<string> {
    return this.$get("id");
  }

  async sku(): Promise<string | null> {
    return (await this.$get("sku")) ?? null;
  }

  async $snapshot(): Promise<CatalogProductVariantInventoryItemSnapshot> {
    return this.$data;
  }
}
