import type { ProductOption } from "../../repositories/models/index.js";
import type { OptionDisplayType } from "./interfaces/index.js";
import { InventoryType } from "./InventoryType.js";
import { OptionValueResolver } from "./OptionValueResolver.js";

/**
 * Option view - resolves Option domain interface
 * Accepts option ID, loads data lazily via loaders
 */
export class OptionResolver extends InventoryType<string, ProductOption | null> {
  async $preload() {
    return this.$ctx.loaders.productOption.load(this.$props);
  }

  id() {
    return this.$props;
  }

  async slug() {
    return (await this.$get("slug")) ?? "";
  }

  async name() {
    const translation = await this.$ctx.loaders.optionTranslation.load(
      this.$props
    );
    if (translation?.name) return translation.name;
    return (await this.$get("slug")) ?? "";
  }

  async displayType(): Promise<OptionDisplayType> {
    return ((await this.$get("displayType")) as OptionDisplayType) ?? "BUTTONS";
  }

  /**
   * Returns option values for this option
   */
  async values() {
    const ids = await this.$ctx.loaders.optionValueIds.load(this.$props);
    return ids.map((id) => new OptionValueResolver(id, this.$ctx));
  }
}
