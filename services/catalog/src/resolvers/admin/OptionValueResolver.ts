import type { ProductOptionValue } from "../../repositories/models/index.js";
import type { ProductOptionSwatch } from "./interfaces/index.js";
import { CatalogType } from "./CatalogType.js";

/**
 * Option value view - resolves ProductOptionValue domain interface
 * Accepts option value ID, loads data lazily via loaders
 */
export class OptionValueResolver extends CatalogType<
  string,
  ProductOptionValue
> {
  async $preload() {
    const value = await this.$ctx.loaders.optionValue.load(this.$props);
    if (!value) {
      throw new Error(`OptionValue with ID ${this.$props} not found`);
    }
    return value;
  }

  id() {
    return this.$props;
  }

  async slug() {
    return (await this.$get("slug")) ?? "";
  }

  async name() {
    const translation = await this.$ctx.loaders.optionValueTranslation.load(
      this.$props
    );
    if (translation?.name) return translation.name;
    return (await this.$get("slug")) ?? "";
  }

  swatch(): ProductOptionSwatch | null {
    // Swatch loader not implemented yet
    return null;
  }
}
