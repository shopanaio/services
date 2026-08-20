import { PreloadNotFoundError } from "@shopana/type-resolver";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { ProductOption } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";

/**
 * Option view - resolves Option domain interface
 * Accepts option ID, loads data lazily via loaders
 */
export class OptionResolver extends CatalogType<string, ProductOption> {
  async $preload() {
    const option = await this.$ctx.loaders.productOption.load(this.$props);
    if (!option) {
      throw new PreloadNotFoundError(`Option with ID ${this.$props} not found`);
    }
    return option;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Option);
  }

  async slug() {
    return (await this.$get("slug")) ?? "";
  }

  async name() {
    const translation = await this.$ctx.loaders.optionTranslation.load(this.$props);
    if (translation?.name) return translation.name;
    return (await this.$get("slug")) ?? "";
  }

  async category() {
    const categoryId = await this.$get("categoryId");
    return this.resolvers.optionCategory(categoryId);
  }

  async sortIndex() {
    return (await this.$get("sortIndex")) ?? 0;
  }

  /**
   * Returns option values for this option
   */
  async values() {
    const ids = await this.$ctx.loaders.optionValueIds.load(this.$props);
    return Promise.all(ids.map((id) => this.resolvers.optionValue(id)));
  }
}
