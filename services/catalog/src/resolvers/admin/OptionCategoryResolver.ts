import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { ProductOptionCategory } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";

@SubgraphReference()
export class OptionCategoryResolver extends CatalogType<
  string,
  ProductOptionCategory
> {
  async $preload() {
    const category = await this.$ctx.loaders.optionCategory.load(this.$props);
    if (!category) {
      throw new PreloadNotFoundError(
        `Product option category with ID ${this.$props} not found`
      );
    }
    return category;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.OptionCategory);
  }

  async name() {
    return this.$get("name");
  }

  async slug() {
    return this.$get("slug");
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}
