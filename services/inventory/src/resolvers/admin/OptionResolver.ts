import { BaseType } from "@shopana/type-resolver";
import type { ProductOption } from "../../repositories/models/index.js";
import type { OptionDisplayType } from "./interfaces/index.js";
import { OptionValueResolver } from "./OptionValueResolver.js";

/**
 * Option view - resolves Option domain interface
 * Accepts option ID, loads data lazily via loaders
 */
export class OptionResolver extends BaseType<string, ProductOption | null> {
  static fields = {
    values: () => OptionValueResolver,
  };

  async loadData() {
    return this.ctx.loaders.productOption.load(this.value);
  }

  id() {
    return this.value;
  }

  async slug() {
    return (await this.get("slug")) ?? "";
  }

  async name() {
    const translation = await this.ctx.loaders.optionTranslation.load(
      this.value
    );
    if (translation?.name) return translation.name;
    return (await this.get("slug")) ?? "";
  }

  async displayType(): Promise<OptionDisplayType> {
    return ((await this.get("displayType")) as OptionDisplayType) ?? "BUTTONS";
  }

  /**
   * Returns option value IDs for this option
   */
  async values(): Promise<string[]> {
    return this.ctx.loaders.optionValueIds.load(this.value);
  }
}
