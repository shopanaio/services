import { CatalogType } from "./CatalogType.js";
import type { FacetValue } from "../../repositories/models/index.js";
import { FacetResolver } from "./FacetResolver.js";
import { FacetSwatchResolver } from "./FacetSwatchResolver.js";

export class FacetValueResolver extends CatalogType<string, FacetValue> {
  async $preload() {
    const facetValue = await this.$ctx.loaders.facetValue.load(this.$props);
    if (!facetValue) {
      throw new Error(`FacetValue with ID ${this.$props} not found`);
    }
    return facetValue;
  }

  id() {
    return this.$props;
  }

  async facet() {
    const facetId = await this.$get("facetId");
    return new FacetResolver(facetId, this.$ctx);
  }

  async slug() {
    return (await this.$get("slug")) ?? "";
  }

  async label() {
    const translation = await this.$ctx.loaders.facetValueTranslation.load(
      this.$props
    );
    return translation?.label ?? "";
  }

  async sourceHandles() {
    const handles = await this.$ctx.loaders.facetValueSourceHandles.load(this.$props);
    return handles.map((item) => item.sourceHandle).sort();
  }

  async swatch() {
    const swatchId = await this.$get("swatchId");
    if (!swatchId) return null;
    return new FacetSwatchResolver(swatchId, this.$ctx);
  }

  async sortIndex() {
    return (await this.$get("sortIndex")) ?? 0;
  }

  async enabled() {
    return (await this.$get("enabled")) ?? false;
  }
}
