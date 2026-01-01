import { SubgraphReference } from "@shopana/type-resolver";
import type { Warehouse } from "../../repositories/models/index.js";
import type { StockRelayInput } from "../../repositories/stock/StockRepository.js";
import { InventoryType } from "./InventoryType.js";
import { StockConnectionResolver } from "./StockConnectionResolver.js";

/**
 * Warehouse resolver - resolves Warehouse domain interface.
 * Decorated with @SubgraphReference for federation support.
 */
@SubgraphReference()
export class WarehouseResolver extends InventoryType<string, Warehouse | null> {
  async $preload() {
    return await this.ctx.loaders.warehouse.load(this.value);
  }

  id() {
    return this.value;
  }

  async code() {
    return this.$get("code");
  }

  async name() {
    return this.$get("name");
  }

  async isDefault() {
    return (await this.$get("isDefault")) ?? false;
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }

  async variantsCount(): Promise<number> {
    // TODO: implement via loader when needed
    return 0;
  }

  stock(args: StockRelayInput) {
    const { where, ...rest } = args;
    return new StockConnectionResolver(
      {
        ...rest,
        where: {
          _and: [
            { warehouseId: { _eq: this.value } },
            ...(where ? [where] : []),
          ],
        },
      },
      this.ctx
    );
  }
}
