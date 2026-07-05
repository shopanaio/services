import type { CatalogProductFeatureValueRef } from "@shopana/broker-types";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductFeatureValueRefResolver extends ServiceType<
  string,
  CatalogProductFeatureValueRef
> {
  protected async $preload(): Promise<CatalogProductFeatureValueRef> {
    const value = await this.$ctx.loaders.featureValue.load(this.$props);
    if (!value) {
      throw new Error(`Product feature value with ID ${this.$props} not found`);
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
