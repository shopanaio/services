import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import type { FacetValue } from "../../repositories/models/index.js";
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
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.FacetValue);
  }

  async facet() {
    const facetId = await this.$get("facetId");
    return this.resolvers.facet(facetId);
  }

  async parent() {
    const parentId = await this.$get("parentId");
    if (!parentId) return null;
    return this.resolvers.facetValue(parentId);
  }

  async kind() {
    return ((await this.$get("kind")) ?? "source").toUpperCase();
  }

  async handle() {
    return (await this.$get("handle")) ?? "";
  }

  async label() {
    const translation = await this.$ctx.loaders.facetValueTranslation.load(
      this.$props
    );
    return translation?.label ?? "";
  }

  async sourceValues() {
    const kind = await this.$get("kind");
    if (kind !== "display") return [];
    const children = await this.$ctx.loaders.facetValueSourceChildren.load(
      this.$props
    );
    return children.map((child) => this.resolvers.facetValue(child.id));
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
