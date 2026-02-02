import type { ProductFeatureValue } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";

/**
 * Feature value view - resolves ProductFeatureValue domain interface
 * Accepts feature value ID, loads data lazily via loaders
 */
export class FeatureValueResolver extends CatalogType<
  string,
  ProductFeatureValue
> {
  async $preload() {
    const data = await this.$ctx.loaders.featureValue.load(this.$props);
    if (!data) {
      throw new Error(`Feature value ${this.$props} not found`);
    }
    return data;
  }

  id() {
    return this.$props;
  }

  async index() {
    return (await this.$get("index")) ?? 0;
  }

  async name() {
    const translation = await this.$ctx.loaders.featureValueTranslation.load(
      this.$props
    );
    if (translation?.name) return translation.name;
    // Fallback to index representation if no translation
    const idx = await this.index();
    return `Value ${idx}`;
  }
}
