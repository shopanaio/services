import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import type { Facet } from "../../repositories/models/index.js";

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

  async sources() {
    const sources = await this.$ctx.loaders.facetSources.load(this.$props);
    return sources
      .map((source) => ({
        handle: source.handle,
        name: source.name ?? source.handle,
      }))
      .sort((left, right) => left.handle.localeCompare(right.handle));
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

  async lexoRank() {
    return (await this.$get("lexoRank")) ?? "";
  }

  async values() {
    const ids = await this.$ctx.loaders.facetValueIds.load(this.$props);
    return Promise.all(ids.map((id) => this.resolvers.facetValue(id)));
  }
}
