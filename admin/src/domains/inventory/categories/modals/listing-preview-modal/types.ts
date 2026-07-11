import type {
  ApiListingOrderByInput,
  ApiListingProductFilter,
} from "@/graphql/types";

export interface ListingPreviewState {
  query: string;
  selectedFacetInputs: ApiListingProductFilter[];
  orderBy: ApiListingOrderByInput;
  after: string | null;
  cursorStack: string[];
}

export interface ListingPreviewSortOption {
  key: string;
  label: string;
  orderBy: ApiListingOrderByInput;
}
