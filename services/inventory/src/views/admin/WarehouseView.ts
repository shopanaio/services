import { BaseType } from "@shopana/type-executor";
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
    console.log(
      "[WarehouseView.loadData] Loading warehouse with id:",
      this.value
    );
    const result = await this.ctx.loaders.warehouse.load(this.value);
    console.log(
      "[WarehouseView.loadData] Loaded result:",
      JSON.stringify(result)
    );
    return result;
  }

  id() {
    console.log("[WarehouseView.id] Returning id:", this.value);
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
