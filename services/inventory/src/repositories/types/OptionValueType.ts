import { BaseType } from "@shopana/type-executor";
import type { ProductOptionSwatch } from "../../domain/index.js";
import type { ProductTypeContext } from "./context.js";

/**
 * Option value type - resolves ProductOptionValue domain interface
 * Accepts option value ID, loads all data via loaders
 */
export class OptionValueType extends BaseType<string> {
  id() {
    return this.value;
  }

  async slug() {
    const ctx = this.ctx<ProductTypeContext>();
    const optionValue = await ctx.loaders.optionValue.load(this.value);
    return optionValue?.slug ?? "";
  }

  async name() {
    const ctx = this.ctx<ProductTypeContext>();
    const translation = await ctx.loaders.optionValueTranslation.load(this.value);
    if (translation?.name) return translation.name;

    // Fallback to slug
    const optionValue = await ctx.loaders.optionValue.load(this.value);
    return optionValue?.slug ?? "";
  }

  async swatch(): Promise<ProductOptionSwatch | null> {
    // Swatch loader not implemented yet - need to add swatchId to optionValue loader
    // and create a swatch loader
    return null;
  }
}
