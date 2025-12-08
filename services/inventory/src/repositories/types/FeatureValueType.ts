import { BaseType } from "@shopana/type-executor";
import type { ProductFeatureValue } from "../models/index.js";
import type { ProductTypeContext } from "./context.js";

/**
 * Feature value type - resolves ProductFeatureValue domain interface
 * Accepts feature value ID, loads data lazily via loaders
 */
export class FeatureValueType extends BaseType<string, ProductFeatureValue | null> {
  protected async loadData() {
    return this.ctx<ProductTypeContext>().loaders.featureValue.load(this.value);
  }

  id() {
    return this.value;
  }

  async slug() {
    return (await this.data)?.slug ?? "";
  }

  async name() {
    const ctx = this.ctx<ProductTypeContext>();
    const translation = await ctx.loaders.featureValueTranslation.load(this.value);
    if (translation?.name) return translation.name;
    return (await this.data)?.slug ?? "";
  }
}
