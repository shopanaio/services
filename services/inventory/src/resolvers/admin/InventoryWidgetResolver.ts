import { InventoryType } from "./InventoryType.js";
import type { ProductInventoryWidgetData } from "../../repositories/inventory-widget/InventoryWidgetRepository.js";

/**
 * WidgetQueryResolver namespace for dashboard widgets.
 *
 * After the Catalog/Inventory split:
 * - inventory() widget stays here (stock metrics)
 * - pricing() widget moved to Catalog service
 */
export class WidgetQueryResolver extends InventoryType<Record<string, never>> {
  /**
   * Get inventory widget data for a product.
   * Returns aggregated inventory metrics across all variants.
   */
  inventory(args: { productId: string }) {
    return new InventoryWidgetResolver(args.productId, this.$ctx);
  }
}

/**
 * Resolver for ProductInventoryWidget.
 * Provides aggregated inventory metrics for the product inventory widget:
 * - Stock quantities (available, on-hand, reserved, unavailable)
 * - 7-day availability change
 * - SKU status metrics (low stock, out of stock, backorder)
 * - Alert thresholds
 */
export class InventoryWidgetResolver extends InventoryType<
  string,
  ProductInventoryWidgetData
> {
  async $preload(): Promise<ProductInventoryWidgetData> {
    return this.$ctx.kernel
      .getServices()
      .repository.inventoryWidget.getWidget(this.$props);
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
