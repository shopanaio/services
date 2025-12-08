import { BaseType } from "@shopana/type-executor";
import type { OptionDisplayType } from "../../domain/index.js";
import type { ProductTypeContext } from "./context.js";
import { OptionValueType } from "./OptionValueType.js";

/**
 * Option type - resolves Option domain interface
 * Accepts option ID, loads all data via loaders
 */
export class OptionType extends BaseType<string> {
  static fields = {
    values: () => OptionValueType,
  };

  id() {
    return this.value;
  }

  async slug() {
    const ctx = this.ctx<ProductTypeContext>();
    const option = await ctx.loaders.productOption.load(this.value);
    return option?.slug ?? "";
  }

  async name() {
    const ctx = this.ctx<ProductTypeContext>();
    const translation = await ctx.loaders.optionTranslation.load(this.value);
    if (translation?.name) return translation.name;

    // Fallback to slug
    const option = await ctx.loaders.productOption.load(this.value);
    return option?.slug ?? "";
  }

  async displayType(): Promise<OptionDisplayType> {
    const ctx = this.ctx<ProductTypeContext>();
    const option = await ctx.loaders.productOption.load(this.value);
    return (option?.displayType as OptionDisplayType) ?? "DROPDOWN";
  }

  /**
   * Returns option value IDs for this option
   */
  async values(): Promise<string[]> {
    const ctx = this.ctx<ProductTypeContext>();
    return ctx.loaders.optionValueIds.load(this.value);
  }
}
