import { InventoryType } from "./InventoryType.js";
import type { ProductInventoryWidgetData } from "../../repositories/inventory-widget/InventoryWidgetRepository.js";

export class WidgetQueryResolver extends InventoryType<Record<string, never>> {
  inventory(args: { productId: string }) {
    return new InventoryWidgetResolver(args.productId, this.$ctx);
  }
}

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
