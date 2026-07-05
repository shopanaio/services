import type { CatalogProductCategorySnapshot } from "@shopana/broker-types";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductCategorySnapshotResolver extends ServiceType<
  string,
  CatalogProductCategorySnapshot
> {
  protected async $preload(): Promise<CatalogProductCategorySnapshot> {
    const category = await this.$ctx.loaders.category.load(this.$props);
    if (!category) {
      throw new Error(`Category with ID ${this.$props} not found`);
    }
    return { id: category.id };
  }

  async id(): Promise<string> {
    return this.$get("id");
  }

  async $snapshot() {
    return this.$data;
  }
}
