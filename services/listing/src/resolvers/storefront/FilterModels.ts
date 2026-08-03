import type {
  PriceRangeResult,
  StorefrontListingFacetResult,
  StorefrontListingFacetValueResult,
} from "../../repositories/storefront/types.js";

export type FilterResolverInput =
  | {
      kind: "facet";
      facet: StorefrontListingFacetResult;
      selectedHandles: readonly string[];
    }
  | {
      kind: "availability";
      availableCount: number;
      unavailableCount: number;
      selected: boolean | undefined;
    }
  | {
      kind: "price";
      range: PriceRangeResult;
      selectedMinMinor: number | undefined;
      selectedMaxMinor: number | undefined;
    };

export type FilterValueResolverInput =
  | {
      kind: "facet";
      facetSlug: string;
      value: StorefrontListingFacetValueResult;
      selected: boolean;
    }
  | {
      kind: "availability";
      available: boolean;
      count: number;
      selected: boolean;
    };

export interface FilterPriceRangeResolverInput {
  range: PriceRangeResult;
  selectedMinMinor: number | undefined;
  selectedMaxMinor: number | undefined;
}
