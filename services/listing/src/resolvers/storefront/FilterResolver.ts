import {
  FacetSelectionMode,
  FilterPresentation,
  FilterType,
} from "./generated/types.js";
import type {
  FilterResolverInput,
  FilterValueResolverInput,
} from "./FilterModels.js";
import { ListingType } from "./ListingType.js";

export class FilterResolver extends ListingType<FilterResolverInput> {
  id() {
    switch (this.$props.kind) {
      case "facet":
        return this.$props.facet.facetSlug;
      case "availability":
        return "availability";
      case "price":
        return "price";
    }
  }

  label() {
    switch (this.$props.kind) {
      case "facet":
        return (
          this.$props.facet.facetLabel ??
          labelFromHandle(this.$props.facet.facetSlug)
        );
      case "availability":
        return "Availability";
      case "price":
        return "Price";
    }
  }

  type() {
    switch (this.$props.kind) {
      case "facet":
        return FilterType.List;
      case "availability":
        return FilterType.Boolean;
      case "price":
        return FilterType.PriceRange;
    }
  }

  facet() {
    if (this.$props.kind !== "facet") return null;
    return this.resolvers.facet(this.$props.facet.facetId);
  }

  async presentation() {
    if (this.$props.kind !== "facet") return FilterPresentation.Text;
    const swatches = await Promise.all(
      this.$props.facet.values
        .map((value) => value.swatchId)
        .filter((id): id is string => !!id)
        .map((id) => this.$ctx.loaders.facetSwatch.load(id))
    );
    return swatches.some(
      (swatch) => swatch && isStorefrontSwatchType(swatch.swatchType)
    )
      ? FilterPresentation.Swatch
      : FilterPresentation.Text;
  }

  async selectionMode() {
    if (this.$props.kind !== "facet") return null;
    const facet = await this.$ctx.loaders.facet.load(this.$props.facet.facetId);
    return facet?.selectionMode?.toUpperCase() === FacetSelectionMode.Single
      ? FacetSelectionMode.Single
      : FacetSelectionMode.Multi;
  }

  priceRange() {
    if (this.$props.kind !== "price") return null;
    return this.resolvers.filterPriceRange({
      range: this.$props.range,
      selectedMinMinor: this.$props.selectedMinMinor,
      selectedMaxMinor: this.$props.selectedMaxMinor,
    });
  }

  values() {
    let values: FilterValueResolverInput[];
    switch (this.$props.kind) {
      case "facet": {
        const selected = new Set(this.$props.selectedHandles);
        values = this.$props.facet.values.map((value) => ({
          kind: "facet",
          facetSlug: this.$props.facet.facetSlug,
          value,
          selected: selected.has(value.valueHandle),
        }));
        break;
      }
      case "availability":
        values = [
          {
            kind: "availability",
            available: true,
            count: this.$props.availableCount,
            selected: this.$props.selected === true,
          },
          {
            kind: "availability",
            available: false,
            count: this.$props.unavailableCount,
            selected: this.$props.selected === false,
          },
        ];
        break;
      case "price":
        values = [];
        break;
    }

    return Promise.all(values.map((value) => this.resolvers.filterValue(value)));
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
