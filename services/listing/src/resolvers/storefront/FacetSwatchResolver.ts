import { PreloadNotFoundError } from "@shopana/type-resolver";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { FacetSwatch } from "../../repositories/models/index.js";
import { ListingType } from "./ListingType.js";

export class FacetSwatchResolver extends ListingType<string, FacetSwatch> {
  async $preload() {
    const swatch = await this.$ctx.loaders.facetSwatch.load(this.$props);
    if (!swatch) {
      throw new PreloadNotFoundError(`FacetSwatch with ID ${this.$props} not found`);
    }
    return swatch;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.FacetSwatch);
  }

  async swatchType() {
    return ((await this.$get("swatchType")) ?? "color").toUpperCase();
  }

  colorOne() {
    return this.$get("colorOne");
  }

  colorTwo() {
    return this.$get("colorTwo");
  }

  metadata() {
    return this.$get("metadata");
  }
}
