import { InventoryType } from "./InventoryType.js";
import type { ProductInventoryWidgetData } from "../../repositories/inventory-widget/InventoryWidgetRepository.js";
import { decodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";

/**
 * Widget query resolver.
 * Only inventory widget remains in Inventory service.
 * Pricing widget moved to Catalog service.
 */
export class WidgetQueryResolver extends InventoryType<Record<string, never>> {
  inventory(args: { productId: string }) {
    const productUuid = decodeGlobalIdByType(args.productId, GlobalIdEntity.Product);
    return new InventoryWidgetResolver(productUuid, this.$ctx);
  }
}

/**
 * Inventory widget resolver.
 * Provides aggregated inventory metrics for a product.
 */
export class InventoryWidgetResolver extends InventoryType<
  string,
  ProductInventoryWidgetData
> {
  async $preload(): Promise<ProductInventoryWidgetData> {
    return this.$ctx.kernel.repository.inventoryWidget.getWidget(this.$props);
  }

  async quantities() {
    return this.$get("quantities");
  }

  async availableChange7d() {
    return this.$get("availableChange7d");
  }

  async skuStatus() {
    return this.$get("skuStatus");
  }

  async backorder() {
    return this.$get("backorder");
  }

  async alertThreshold() {
    return this.$get("alertThreshold");
  }
}
