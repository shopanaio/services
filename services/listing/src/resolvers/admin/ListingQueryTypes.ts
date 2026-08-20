export const DEFAULT_LISTING_PAGE_SIZE = 20;
export const MAX_LISTING_PAGE_SIZE = 100;

export type ListingScopeKind = "GLOBAL" | "CATEGORY" | "COLLECTION";
export type ListingSortBy =
  | "MANUAL"
  | "RELEVANCE"
  | "NEWEST"
  | "CREATED"
  | "NAME"
  | "PRICE";
export type ListingSortDirection = "asc" | "desc";

export interface ListingScopeInput {
  kind: ListingScopeKind;
  categoryId?: string | null;
  collectionId?: string | null;
}

export interface ListingPriceRangeFilter {
  min?: string | number | null;
  max?: string | number | null;
}

export interface ListingVariantOptionFilter {
  name: string;
  value: string;
}

export interface ListingFacetValueFilter {
  facet: string;
  value: string;
}

export interface ListingProductFilter {
  statuses?: Array<"DRAFT" | "PUBLISHED"> | null;
  available?: boolean | null;
  price?: ListingPriceRangeFilter | null;
  productVendor?: string | null;
  tag?: string | null;
  variantOption?: ListingVariantOptionFilter | null;
  productFacet?: ListingFacetValueFilter | null;
  variantFacet?: ListingFacetValueFilter | null;
}

export interface ListingOrderByInput {
  by: ListingSortBy;
  direction?: ListingSortDirection | null;
}

export interface ListingQueryArgs {
  resolvedScope?: import("../../repositories/storefront/types.js").StorefrontListingScope;
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  scope?: ListingScopeInput | null;
  query?: string | null;
  locale?: string | null;
  currency?: string | null;
  facets?: ListingProductFilter[] | null;
  orderBy?: ListingOrderByInput | null;
}

export type ListingNodeReference = {
  __typename: "Product";
  id: string;
};

export type ListingFacetType = "LIST" | "BOOLEAN" | "PRICE_RANGE";
export type ListingFacetUiType =
  | "CHECKBOX"
  | "RADIO"
  | "DROPDOWN"
  | "RANGE"
  | "BOOLEAN";

export type FacetSwatchReference = {
  __typename: "FacetSwatch";
  id: string;
};

export interface ListingFacetValue {
  id: string;
  label: string;
  count: number;
  selected: boolean;
  input: ListingProductFilter;
  swatch: FacetSwatchReference | null;
}

export interface ListingFacet {
  id: string;
  label: string;
  type: ListingFacetType;
  uiType: ListingFacetUiType;
  values: ListingFacetValue[];
}
