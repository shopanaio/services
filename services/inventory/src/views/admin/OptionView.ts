import { BaseType } from "@shopana/type-executor";
import type { ProductOption } from "../../repositories/models/index.js";
import type { OptionDisplayType } from "./interfaces/index.js";
import type { AdminViewContext } from "./context.js";
import { OptionValueView } from "./OptionValueView.js";

/**
 * Option view - resolves Option domain interface
 * Accepts option ID, loads data lazily via loaders
 */
export class OptionView extends BaseType<string, ProductOption | null> {
  static fields = {
    values: () => OptionValueView,
  };

  async loadData() {
    return this.ctx<AdminViewContext>().loaders.productOption.load(
      this.value
    );
  }

  id() {
    return this.value;
  }

  async slug() {
    return (await this.data)?.slug ?? "";
  }

  async name() {
    const ctx = this.ctx<AdminViewContext>();
    const translation = await ctx.loaders.optionTranslation.load(this.value);
    if (translation?.name) return translation.name;
    return (await this.data)?.slug ?? "";
  }

  async displayType(): Promise<OptionDisplayType> {
    return ((await this.data)?.displayType as OptionDisplayType) ?? "BUTTONS";
  }

  /**
   * Returns option value IDs for this option
   */
  async values(): Promise<string[]> {
    const ctx = this.ctx<AdminViewContext>();
    return ctx.loaders.optionValueIds.load(this.value);
  }
}
