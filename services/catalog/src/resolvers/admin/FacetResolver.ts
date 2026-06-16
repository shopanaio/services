import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import type { Facet } from "../../repositories/models/index.js";
import { FacetGroupResolver } from "./FacetGroupResolver.js";
import { FacetValueResolver } from "./FacetValueResolver.js";

export class FacetResolver extends CatalogType<string, Facet> {
  async $preload() {
    const facet = await this.$ctx.loaders.facet.load(this.$props);
    if (!facet) {
      throw new Error(`Facet with ID ${this.$props} not found`);
    }
    return facet;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Facet);
  }

  async facetType() {
    return ((await this.$get("facetType")) ?? "").toUpperCase();
  }

  async sourceHandles() {
    const valueIds = await this.$ctx.loaders.facetValueIds.load(this.$props);
    const sourceRows = await Promise.all(
      valueIds.map((valueId) => this.$ctx.loaders.facetValueSourceHandles.load(valueId))
    );
    return Array.from(
      new Set(sourceRows.flat().map((row) => row.sourceHandle))
    ).sort();
  }

  async slug() {
    return (await this.$get("slug")) ?? "";
  }

  async label() {
    const translation = await this.$ctx.loaders.facetTranslation.load(this.$props);
    return translation?.label ?? "";
  }

  async uiType() {
    return ((await this.$get("uiType")) ?? "checkbox").toUpperCase();
  }

  async selectionMode() {
    return ((await this.$get("selectionMode")) ?? "multi").toUpperCase();
  }

  async sortIndex() {
    return (await this.$get("sortIndex")) ?? 0;
  }

  async group() {
    const groupId = await this.$get("groupId");
    if (!groupId) return null;
    return new FacetGroupResolver(groupId, this.$ctx);
  }

  async minValues() {
    return (await this.$get("minValues")) ?? 1;
  }

  async maxValuesVisible() {
    return (await this.$get("maxValuesVisible")) ?? 10;
  }

  async valueSort() {
    return ((await this.$get("valueSort")) ?? "count").toUpperCase();
  }

  async indexable() {
    return (await this.$get("indexable")) ?? false;
  }

  async values() {
    const ids = await this.$ctx.loaders.facetValueIds.load(this.$props);
    return ids.map((id) => new FacetValueResolver(id, this.$ctx));
  }
}
