import { BaseType } from "@shopana/type-executor";
import type { ProductFeature } from "../models/index.js";
import type { ProductTypeContext } from "./context.js";
import { FeatureValueType } from "./FeatureValueType.js";

/**
 * Feature type - resolves Feature domain interface
 * Accepts feature ID, loads data lazily via loaders
 */
export class FeatureType extends BaseType<string, ProductFeature | null> {
  static fields = {
    values: () => FeatureValueType,
  };

  protected async loadData() {
    return this.ctx<ProductTypeContext>().loaders.productFeature.load(this.value);
  }

  id() {
    return this.value;
  }

  async slug() {
    return (await this.data)?.slug ?? "";
  }

  async name() {
    const ctx = this.ctx<ProductTypeContext>();
    const translation = await ctx.loaders.featureTranslation.load(this.value);
    if (translation?.name) return translation.name;
    return (await this.data)?.slug ?? "";
  }

  /**
   * Returns feature value IDs for this feature
   */
  async values(): Promise<string[]> {
    const ctx = this.ctx<ProductTypeContext>();
    return ctx.loaders.featureValueIds.load(this.value);
  }
}
