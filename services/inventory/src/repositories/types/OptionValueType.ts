import { BaseType } from "@shopana/type-executor";
import type { ProductOptionValue } from "../models/index.js";
import type { ProductOptionSwatch } from "../../domain/index.js";
import type { ProductTypeContext } from "./context.js";

/**
 * Option value type - resolves ProductOptionValue domain interface
 * Accepts option value ID, loads data lazily via loaders
 */
export class OptionValueType extends BaseType<string, ProductOptionValue | null> {
  protected async loadData() {
    return this.ctx<ProductTypeContext>().loaders.optionValue.load(this.value);
  }

  id() {
    return this.value;
  }

  async slug() {
    return (await this.data)?.slug ?? "";
  }

  async name() {
    const ctx = this.ctx<ProductTypeContext>();
    const translation = await ctx.loaders.optionValueTranslation.load(this.value);
    if (translation?.name) return translation.name;
    return (await this.data)?.slug ?? "";
  }

  swatch(): ProductOptionSwatch | null {
    // Swatch loader not implemented yet
    return null;
  }
}
