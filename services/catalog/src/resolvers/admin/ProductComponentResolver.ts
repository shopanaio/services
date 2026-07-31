import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { Component } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";
import { ProductComponentConfigurationResolver } from "./ProductComponentConfigurationResolver.js";

export class ProductComponentResolver extends CatalogType<string, Component> {
  async $preload() {
    const component = await this.$ctx.loaders.component.load(this.$props);
    if (!component) {
      throw new PreloadNotFoundError(
        `Product component with ID ${this.$props} not found`,
      );
    }
    return component;
  }

  id() {
    return this.$props;
  }

  async product() {
    return this.resolvers.product(await this.$get("productId"));
  }

  async displayStyle() {
    return this.$get("displayStyle");
  }

  async configurations() {
    const ids =
      await this.$ctx.loaders.componentConfigurationIdsByComponentId.load(
        this.$props,
      );
    return ids.map(
      (id: string) =>
        new ProductComponentConfigurationResolver(id, this.$ctx),
    );
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}
