import {
  PreloadNotFoundError,
  SubgraphReference,
} from "@shopana/type-resolver";
import {
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { Warehouse } from "../../repositories/models/index.js";
import type { StockRelayInput } from "../../repositories/stock/StockRepository.js";
import { CatalogType } from "./CatalogType.js";
import { normalizeWarehouseStockWhereInput } from "./filter-normalizers.js";

/**
 * Warehouse resolver - resolves Warehouse domain interface.
 * Decorated with @SubgraphReference for federation support.
 */
@SubgraphReference()
export class WarehouseResolver extends CatalogType<string, Warehouse> {
  async $preload() {
    const warehouse = await this.$ctx.loaders.warehouse.load(this.$props);

    if (!warehouse) {
      throw new PreloadNotFoundError(
        `Warehouse with ID ${this.$props} not found`
      );
    }

    return warehouse;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Warehouse);
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
    return this.$ctx.kernel.repository.stock.countByFilter(this.$props);
  }

  stock(args: StockRelayInput) {
    const { where, ...rest } = args;
    const normalizedWhere = normalizeWarehouseStockWhereInput(where);

    return this.resolvers.stockConnection({
      ...rest,
      where: {
        _and: [
          { warehouseId: { _eq: this.$props } },
          ...(normalizedWhere ? [normalizedWhere] : []),
        ],
      },
    });
  }
}
