import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { ComponentGroup } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";
import { ProductComponentItemResolver } from "./ProductComponentItemResolver.js";

export class ProductComponentGroupResolver extends CatalogType<
  string,
  ComponentGroup
> {
  async $preload() {
    const group = await this.$ctx.loaders.componentGroup.load(this.$props);
    if (!group) {
      throw new PreloadNotFoundError(
        `Product component group with ID ${this.$props} not found`,
      );
    }
    return group;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.ProductComponentGroup);
  }

  async sortIndex() {
    return this.$get("sortIndex");
  }

  async title() {
    const translation =
      await this.$ctx.loaders.componentGroupTranslation.load(this.$props);
    return translation?.name ?? "";
  }

  async minSelection() {
    return this.$get("minSelection");
  }

  async maxSelection() {
    return this.$get("maxSelection");
  }

  async items() {
    const ids = await this.$ctx.loaders.componentItemIdsByGroupId.load(
      this.$props,
    );
    return ids.map(
      (id: string) => new ProductComponentItemResolver(id, this.$ctx),
    );
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}
