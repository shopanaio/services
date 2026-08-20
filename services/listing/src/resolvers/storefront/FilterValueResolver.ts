import { Availability } from "./generated/types.js";
import type { FilterValueResolverInput } from "./FilterModels.js";
import { ListingType } from "./ListingType.js";

export class FilterValueResolver extends ListingType<FilterValueResolverInput> {
  id() {
    return this.$props.kind === "facet"
      ? this.$props.value.valueHandle
      : this.$props.available
        ? Availability.Available
        : Availability.Unavailable;
  }

  label() {
    if (this.$props.kind === "availability") {
      return this.$props.available ? "Available" : "Unavailable";
    }
    return this.$props.value.valueLabel ?? labelFromHandle(this.$props.value.valueHandle);
  }

  count() {
    return this.$props.kind === "facet" ? this.$props.value.count : this.$props.count;
  }

  selected() {
    return this.$props.selected;
  }

  input() {
    if (this.$props.kind === "facet") {
      return {
        facet: {
          facet: this.$props.facetSlug,
          value: this.$props.value.valueHandle,
        },
      };
    }
    return {
      availability: this.$props.available ? Availability.Available : Availability.Unavailable,
    };
  }

  facetValue() {
    if (this.$props.kind !== "facet") return null;
    return this.resolvers.facetValue(this.$props.value.facetValueId);
  }

  async swatch() {
    if (this.$props.kind !== "facet" || !this.$props.value.swatchId) return null;
    const swatch = await this.$ctx.loaders.facetSwatch.load(this.$props.value.swatchId);
    if (!swatch || !isStorefrontSwatchType(swatch.swatchType)) return null;
    return this.resolvers.facetSwatch(this.$props.value.swatchId);
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
