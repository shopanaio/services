import type { CatalogProductOptionValueRef } from "@shopana/broker-types";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductOptionValueRefResolver extends ServiceType<
  string,
  CatalogProductOptionValueRef
> {
  protected async $preload(): Promise<CatalogProductOptionValueRef> {
    const value = await this.$ctx.loaders.optionValue.load(this.$props);
    if (!value) {
      throw new PreloadNotFoundError(
        `Product option value with ID ${this.$props} not found`
      );
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
