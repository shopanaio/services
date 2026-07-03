import type {
  FacetRuntimeType,
  StorefrontListingFacetResult,
  StorefrontListingRepositoryResult,
} from "../../repositories/storefront/types.js";
import {
  filterSelectionKey,
  hasSelectedPrice,
  normalizeListingFilters,
} from "./listingInput.js";
import {
  type ListingFacet,
  type ListingFacetUiType,
  type ListingFacetValueFilter,
  type ListingProductFilter,
  type ListingQueryArgs,
} from "./ListingQueryTypes.js";
import { toFacetSwatchReference } from "./listingReferences.js";

export function mapListingFacets(
  result: StorefrontListingRepositoryResult,
  args: ListingQueryArgs
): ListingFacet[] {
  const selectedFilters = normalizeListingFilters(args.facets ?? []);
  const selected = new Set(selectedFilters.map((filter) => filterSelectionKey(filter)));

  return [
    ...result.facets.map((facet) => mapCatalogFacet(facet, selected)),
    ...mapVirtualFacets(result, selected, hasSelectedPrice(selectedFilters)),
  ];
}

function mapCatalogFacet(
  facet: StorefrontListingFacetResult,
  selected: ReadonlySet<string>
): ListingFacet {
  return {
    id: facet.facetSlug,
    label: facet.facetLabel ?? labelFromHandle(facet.facetSlug),
    type: "LIST",
    uiType: normalizeUiType(facet.uiType),
    values: facet.values.map((value) => {
      const input = facetValueInput(facet.facetType, {
        facet: facet.facetSlug,
        value: value.valueHandle,
      });

      return {
        id: value.valueHandle,
        label: value.valueLabel ?? labelFromHandle(value.valueHandle),
        count: value.count,
        selected: selected.has(filterSelectionKey(input)),
        input,
        swatch: toFacetSwatchReference(value.swatchId),
      };
    }),
  };
}

function mapVirtualFacets(
  result: StorefrontListingRepositoryResult,
  selected: ReadonlySet<string>,
  priceSelected: boolean
): ListingFacet[] {
  const facets: ListingFacet[] = [
    {
      id: "available",
      label: "Available",
      type: "BOOLEAN",
      uiType: "BOOLEAN",
      values: [
        {
          id: "true",
          label: "Available",
          count: result.inStockCount,
          selected: selected.has("in_stock:true"),
          input: { available: true },
          swatch: null,
        },
      ],
    },
  ];

  if (result.priceRange) {
    facets.push({
      id: "price",
      label: "Price",
      type: "PRICE_RANGE",
      uiType: "RANGE",
      values: [
        {
          id: "range",
          label: "Price",
          count: result.totalCount,
          selected: priceSelected,
          input: {
            price: {
              min: String(result.priceRange.minPriceMinor),
              max: String(result.priceRange.maxPriceMinor),
            },
          },
          swatch: null,
        },
      ],
    });
  }

  return facets;
}

function facetValueInput(
  facetType: FacetRuntimeType,
  value: ListingFacetValueFilter
): ListingProductFilter {
  // Returned inputs are intentionally reusable as the next facets[] payload.
  if (facetType === "OPTION") {
    return { variantFacet: value };
  }
  if (facetType === "TAG") {
    return { tag: value.value };
  }
  return { productFacet: value };
}

function normalizeUiType(uiType: string | null | undefined): ListingFacetUiType {
  const normalized = uiType?.trim().toUpperCase();

  switch (normalized) {
    case "RADIO":
      return "RADIO";
    case "DROPDOWN":
      return "DROPDOWN";
    case "RANGE":
      return "RANGE";
    case "BOOLEAN":
      return "BOOLEAN";
    case "CHECKBOX":
    default:
      return "CHECKBOX";
  }
}

function labelFromHandle(handle: string): string {
  return handle
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
