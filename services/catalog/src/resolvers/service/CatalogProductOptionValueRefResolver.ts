import type { CatalogProductOptionValueRef } from "@shopana/broker-types";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductOptionValueRefResolver extends ServiceType<
  string,
  CatalogProductOptionValueRef
> {
  protected async $preload(): Promise<CatalogProductOptionValueRef> {
    const value = await this.$ctx.loaders.optionValue.load(this.$props);
    if (!value) {
      throw new Error(`Product option value with ID ${this.$props} not found`);
    }
    return { id: value.id, handle: value.slug };
  }

  async id(): Promise<string | null> {
    return (await this.$get("id")) ?? null;
  }

  async handle(): Promise<string> {
    return this.$get("handle");
  }

  async $snapshot() {
    return this.$data;
  }
}
