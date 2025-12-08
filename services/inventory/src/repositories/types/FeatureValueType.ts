import { BaseType } from "@shopana/type-executor";
import type { ProductTypeContext } from "./context.js";

/**
 * Feature value type - resolves ProductFeatureValue domain interface
 * Accepts feature value ID, loads all data via loaders
 */
export class FeatureValueType extends BaseType<string> {
  id() {
    return this.value;
  }

  async slug() {
    const ctx = this.ctx<ProductTypeContext>();
    const featureValue = await ctx.loaders.featureValue.load(this.value);
    return featureValue?.slug ?? "";
  }

  async name() {
    const ctx = this.ctx<ProductTypeContext>();
    const translation = await ctx.loaders.featureValueTranslation.load(this.value);
    if (translation?.name) return translation.name;

    // Fallback to slug
    const featureValue = await ctx.loaders.featureValue.load(this.value);
    return featureValue?.slug ?? "";
  }
}
