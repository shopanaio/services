import type { ProductOptionValue } from "../../repositories/models/index.js";
import type { ProductOptionSwatch } from "./interfaces/index.js";
import { InventoryType } from "./InventoryType.js";

/**
 * Option value view - resolves ProductOptionValue domain interface
 * Accepts option value ID, loads data lazily via loaders
 */
export class OptionValueResolver extends InventoryType<
  string,
  ProductOptionValue | null
> {
  async $preload() {
    return this.$ctx.loaders.optionValue.load(this.$props);
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
