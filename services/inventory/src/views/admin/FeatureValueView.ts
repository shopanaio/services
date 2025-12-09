import { BaseType } from "@shopana/type-executor";
import type { ProductFeatureValue } from "../../repositories/models/index.js";
import type { AdminViewContext } from "./context.js";

/**
 * Feature value view - resolves ProductFeatureValue domain interface
 * Accepts feature value ID, loads data lazily via loaders
 */
export class FeatureValueView extends BaseType<string, ProductFeatureValue | null> {
  async loadData() {
    return this.ctx<AdminViewContext>().loaders.featureValue.load(this.value);
  }

  id() {
    return this.value;
  }

  async slug() {
    return (await this.data)?.slug ?? "";
  }

  async name() {
    const ctx = this.ctx<AdminViewContext>();
    const translation = await ctx.loaders.featureValueTranslation.load(this.value);
    if (translation?.name) return translation.name;
    return (await this.data)?.slug ?? "";
  }
}
