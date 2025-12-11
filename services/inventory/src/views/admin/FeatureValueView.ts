import { BaseType } from "@shopana/type-resolver";
import type { ProductFeatureValue } from "../../repositories/models/index.js";

/**
 * Feature value view - resolves ProductFeatureValue domain interface
 * Accepts feature value ID, loads data lazily via loaders
 */
export class FeatureValueView extends BaseType<
  string,
  ProductFeatureValue | null
> {
  async loadData() {
    return this.ctx.loaders.featureValue.load(this.value);
  }

  id() {
    return this.value;
  }

  async slug() {
    return (await this.get("slug")) ?? "";
  }

  async name() {
    const translation = await this.ctx.loaders.featureValueTranslation.load(
      this.value
    );
    if (translation?.name) return translation.name;
    return (await this.get("slug")) ?? "";
  }
}
