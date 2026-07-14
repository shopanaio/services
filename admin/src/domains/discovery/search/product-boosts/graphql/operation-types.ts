import type {
  ApiListingQuery,
  ApiListingSearchQuery,
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

export interface SearchProductBoostsQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiSearchProductBoostWhereInput | null;
  orderBy?: ApiSearchProductBoostOrderByInput[] | null;
}
