import { BaseType } from "@shopana/type-executor";
import type { ProductFeature } from "../../repositories/models/index.js";
import type { AdminViewContext } from "./context.js";
import { FeatureValueView } from "./FeatureValueView.js";

/**
 * Feature view - resolves Feature domain interface
 * Accepts feature ID, loads data lazily via loaders
 */
export class FeatureView extends BaseType<string, ProductFeature | null> {
  static fields = {
    values: () => FeatureValueView,
  };

  async loadData() {
    return this.ctx<AdminViewContext>().loaders.productFeature.load(this.value);
  }

  id() {
    return this.value;
  }

  async slug() {
    return (await this.data)?.slug ?? "";
  }

  async name() {
    const ctx = this.ctx<AdminViewContext>();
    const translation = await ctx.loaders.featureTranslation.load(this.value);
    if (translation?.name) return translation.name;
    return (await this.data)?.slug ?? "";
  }

  /**
   * Returns feature value IDs for this feature
   */
  async values(): Promise<string[]> {
    const ctx = this.ctx<AdminViewContext>();
    return ctx.loaders.featureValueIds.load(this.value);
  }
}
