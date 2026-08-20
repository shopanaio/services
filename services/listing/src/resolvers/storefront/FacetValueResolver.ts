import { PreloadNotFoundError } from "@shopana/type-resolver";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { FacetValue } from "../../repositories/models/index.js";
import { ListingType } from "./ListingType.js";

export class FacetValueResolver extends ListingType<string, FacetValue> {
  async $preload() {
    const value = await this.$ctx.loaders.facetValue.load(this.$props);
    if (!value) {
      throw new PreloadNotFoundError(`FacetValue with ID ${this.$props} not found`);
    }
    return value;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.FacetValue);
  }

  async facet() {
    return this.resolvers.facet(await this.$get("facetId"));
  }

  async kind() {
    return ((await this.$get("kind")) ?? "source").toUpperCase();
  }

  async handle() {
    return (await this.$get("handle")) ?? "";
  }

  async label() {
    const [translation, handle] = await Promise.all([
      this.$ctx.loaders.facetValueTranslation.load(this.$props),
      this.$get("handle"),
    ]);
    return translation?.label ?? labelFromHandle(handle ?? "");
  }

  async swatch() {
    const swatchId = await this.$get("swatchId");
    if (!swatchId) return null;
    const swatch = await this.$ctx.loaders.facetSwatch.load(swatchId);
    if (!swatch || !isStorefrontSwatchType(swatch.swatchType)) return null;
    return this.resolvers.facetSwatch(swatchId);
  }

  async sortIndex() {
    return (await this.$get("sortIndex")) ?? 0;
  }
}

function isStorefrontSwatchType(value: string): boolean {
  const normalized = value.toUpperCase();
  return normalized === "COLOR" || normalized === "GRADIENT";
}

function labelFromHandle(handle: string): string {
  return handle
    .split(/[-_]/gu)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
