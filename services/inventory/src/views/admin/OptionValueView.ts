import { BaseType } from "@shopana/type-executor";
import type { ProductOptionValue } from "../../repositories/models/index.js";
import type { ProductOptionSwatch } from "./interfaces/index.js";

/**
 * Option value view - resolves ProductOptionValue domain interface
 * Accepts option value ID, loads data lazily via loaders
 */
export class OptionValueView extends BaseType<
  string,
  ProductOptionValue | null
> {
  async loadData() {
    return this.ctx.loaders.optionValue.load(this.value);
  }

  id() {
    return this.value;
  }

  async slug() {
    return (await this.get("slug")) ?? "";
  }

  async name() {
    const translation = await this.ctx.loaders.optionValueTranslation.load(
      this.value
    );
    if (translation?.name) return translation.name;
    return (await this.get("slug")) ?? "";
  }

  swatch(): ProductOptionSwatch | null {
    // Swatch loader not implemented yet
    return null;
  }
}
