import type {
  ApiListingOrderByInput,
  ApiListingProductFilter,
} from "@/graphql/types";

export interface ListingPreviewState {
  selectedFacetInputs: ApiListingProductFilter[];
  orderBy: ApiListingOrderByInput;
  after: string | null;
  cursorStack: string[];
  query: string;
}

export interface ListingPreviewSortOption {
  key: string;
  label: string;
  orderBy: ApiListingOrderByInput;
}
