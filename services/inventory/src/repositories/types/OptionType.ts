import { BaseType } from "@shopana/type-executor";
import type { ProductOption } from "../models/index.js";
import type { OptionDisplayType } from "../../domain/index.js";
import type { ProductTypeContext } from "./context.js";
import { OptionValueType } from "./OptionValueType.js";

/**
 * Option type - resolves Option domain interface
 * Accepts option ID, loads data lazily via loaders
 */
export class OptionType extends BaseType<string, ProductOption | null> {
  static fields = {
    values: () => OptionValueType,
  };

  protected async loadData() {
    return this.ctx<ProductTypeContext>().loaders.productOption.load(this.value);
  }

  id() {
    return this.value;
  }

  async slug() {
    return (await this.data)?.slug ?? "";
  }

  async name() {
    const ctx = this.ctx<ProductTypeContext>();
    const translation = await ctx.loaders.optionTranslation.load(this.value);
    if (translation?.name) return translation.name;
    return (await this.data)?.slug ?? "";
  }

  async displayType(): Promise<OptionDisplayType> {
    return ((await this.data)?.displayType as OptionDisplayType) ?? "DROPDOWN";
  }

  /**
   * Returns option value IDs for this option
   */
  async values(): Promise<string[]> {
    const ctx = this.ctx<ProductTypeContext>();
    return ctx.loaders.optionValueIds.load(this.value);
  }
}
