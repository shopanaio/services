import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import type { FacetGroup } from "../../repositories/models/index.js";
import { FacetResolver } from "./FacetResolver.js";

export class FacetGroupResolver extends CatalogType<string, FacetGroup> {
  async $preload() {
    const group = await this.$ctx.loaders.facetGroup.load(this.$props);
    if (!group) {
      throw new Error(`FacetGroup with ID ${this.$props} not found`);
    }
    return group;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.FacetGroup);
  }

  async name() {
    const translation = await this.$ctx.loaders.facetGroupTranslation.load(
      this.$props
    );
    return translation?.name ?? "";
  }

  async sortIndex() {
    return (await this.$get("sortIndex")) ?? 0;
  }

  async collapsed() {
    return (await this.$get("collapsed")) ?? false;
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }

  async facets() {
    const ids = await this.$ctx.loaders.facetIdsByGroup.load(this.$props);
    return ids.map((id) => new FacetResolver(id, this.$ctx));
  }
}
