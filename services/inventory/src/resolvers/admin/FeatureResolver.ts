import type { ProductFeature } from "../../repositories/models/index.js";
import { InventoryType } from "./InventoryType.js";
import { FeatureValueResolver } from "./FeatureValueResolver.js";

/**
 * Feature view - resolves Feature domain interface
 * Accepts feature ID, loads data lazily via loaders
 */
export class FeatureResolver extends InventoryType<string, ProductFeature | null> {
  static fields = {
    values: () => FeatureValueResolver,
  };

  async loadData() {
    return this.ctx.loaders.productFeature.load(this.value);
  }

  id() {
    return this.value;
  }

  async slug() {
    return (await this.get("slug")) ?? "";
  }

  async name() {
    const translation = await this.ctx.loaders.featureTranslation.load(
      this.value
    );
    if (translation?.name) return translation.name;
    return (await this.get("slug")) ?? "";
  }

  /**
   * Returns feature value IDs for this feature
   */
  async values(): Promise<string[]> {
    return this.ctx.loaders.featureValueIds.load(this.value);
  }
}
