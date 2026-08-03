import { PreloadNotFoundError } from "@shopana/type-resolver";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { Facet } from "../../repositories/models/index.js";
import { ListingType } from "./ListingType.js";

export class FacetResolver extends ListingType<string, Facet> {
  async $preload() {
    const facet = await this.$ctx.loaders.facet.load(this.$props);
    if (!facet) {
      throw new PreloadNotFoundError(`Facet with ID ${this.$props} not found`);
    }
    return facet;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Facet);
  }

  async facetType() {
    return ((await this.$get("facetType")) ?? "").toUpperCase();
  }

  async slug() {
    return (await this.$get("slug")) ?? "";
  }

  async label() {
    const [translation, slug] = await Promise.all([
      this.$ctx.loaders.facetTranslation.load(this.$props),
      this.$get("slug"),
    ]);
    return translation?.label ?? labelFromHandle(slug ?? "");
  }

  async uiType() {
    return ((await this.$get("uiType")) ?? "checkbox").toUpperCase();
  }

  async selectionMode() {
    return ((await this.$get("selectionMode")) ?? "multi").toUpperCase();
  }
}

function labelFromHandle(handle: string): string {
  return handle
    .split(/[-_]/gu)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
