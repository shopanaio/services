import type {
  ApiListingQuery,
  ApiListingSearchQuery,
  ApiSearchSettings,
  ApiSearchProductBoost,
  ApiSearchProductBoostConnection,
  ApiSearchProductBoostOrderByInput,
  ApiSearchProductBoostWhereInput,
} from "@/graphql/types";

export interface SearchProductBoostsQueryData {
  listingQuery: Pick<ApiListingQuery, "search"> & {
    search: Pick<ApiListingSearchQuery, "productBoosts"> & {
      productBoosts: ApiSearchProductBoostConnection;
    };
  };
}

export interface SearchProductBoostEditorQueryData {
  listingQuery: Pick<ApiListingQuery, "search"> & {
    search: Pick<ApiListingSearchQuery, "settings" | "productBoost"> & {
      settings?: ApiSearchSettings | null;
      productBoost?: ApiSearchProductBoost | null;
    };
  };
}

export interface SearchProductBoostEditorQueryVariables {
  id: string;
}

export interface SearchProductBoostsQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiSearchProductBoostWhereInput | null;
  orderBy?: ApiSearchProductBoostOrderByInput[] | null;
}
