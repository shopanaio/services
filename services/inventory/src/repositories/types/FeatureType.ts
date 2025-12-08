import { BaseType } from "@shopana/type-executor";
import type { ProductTypeContext } from "./context.js";
import { FeatureValueType } from "./FeatureValueType.js";

/**
 * Feature type - resolves Feature domain interface
 * Accepts feature ID, loads all data via loaders
 */
export class FeatureType extends BaseType<string> {
  static fields = {
    values: () => FeatureValueType,
  };

  id() {
    return this.value;
  }

  async slug() {
    const ctx = this.ctx<ProductTypeContext>();
    const feature = await ctx.loaders.productFeature.load(this.value);
    return feature?.slug ?? "";
  }

  async name() {
    const ctx = this.ctx<ProductTypeContext>();
    const translation = await ctx.loaders.featureTranslation.load(this.value);
    if (translation?.name) return translation.name;

    // Fallback to slug
    const feature = await ctx.loaders.productFeature.load(this.value);
    return feature?.slug ?? "";
  }

  /**
   * Returns feature value IDs for this feature
   */
  async values(): Promise<string[]> {
    const ctx = this.ctx<ProductTypeContext>();
    return ctx.loaders.featureValueIds.load(this.value);
  }
}
