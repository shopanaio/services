import { BaseType } from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";
import type { Warehouse } from "../../repositories/models/index.js";

/**
 * Warehouse view - resolves Warehouse domain interface
 * Accepts warehouse ID, loads data lazily via loaders
 */
export class WarehouseView extends BaseType<
  string,
  Warehouse | null,
  ServiceContext
> {
  async loadData() {
    return await this.ctx.loaders.warehouse.load(this.value);
  }

  id() {
    return this.value;
  }

  async code() {
    return this.get("code");
  }

  async name() {
    return this.get("name");
  }

  async isDefault() {
    return (await this.get("isDefault")) ?? false;
  }

  async createdAt() {
    return this.get("createdAt");
  }

  async updatedAt() {
    return this.get("updatedAt");
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
