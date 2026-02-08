import { CatalogType } from "./CatalogType.js";
import type { FacetSwatch } from "../../repositories/models/index.js";

export class FacetSwatchResolver extends CatalogType<string, FacetSwatch> {
  async $preload() {
    const swatch = await this.$ctx.loaders.facetSwatch.load(this.$props);
    if (!swatch) {
      throw new Error(`FacetSwatch with ID ${this.$props} not found`);
    }
    return swatch;
  }

  id() {
    return this.$props;
  }

  async swatchType() {
    return ((await this.$get("swatchType")) ?? "COLOR").toUpperCase();
  }

  async colorOne() {
    return this.$get("colorOne");
  }

  async colorTwo() {
    return this.$get("colorTwo");
  }

  async file() {
    const imageId = await this.$get("imageId");
    if (!imageId) return null;
    return { __typename: "File" as const, id: imageId };
  }

  async metadata() {
    return this.$get("metadata");
  }
}
