import { BaseType } from "@shopana/type-executor";
import type { Warehouse } from "../../repositories/models/index.js";
import { InventoryContext } from "../../context/types.js";

/**
 * Warehouse view - resolves Warehouse domain interface
 * Accepts warehouse ID, loads data lazily via loaders
 */
export class WarehouseView extends BaseType<
  string,
  Warehouse | null,
  InventoryContext
> {
  async loadData() {
    return this.ctx.loaders.warehouse.load(this.value);
  }

  id() {
    return this.value;
  }

  async code() {
    return (await this.data)?.code ?? null;
  }

  async name() {
    return (await this.data)?.name ?? null;
  }

  async isDefault() {
    return (await this.data)?.isDefault ?? false;
  }

  async createdAt() {
    return (await this.data)?.createdAt ?? null;
  }

  async updatedAt() {
    return (await this.data)?.updatedAt ?? null;
  }

  async variantsCount(): Promise<number> {
    // TODO: implement via loader when needed
    return 0;
  }

  async stock() {
    // TODO: implement stock connection when needed
    return {
      edges: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
      totalCount: 0,
    };
  }
}
