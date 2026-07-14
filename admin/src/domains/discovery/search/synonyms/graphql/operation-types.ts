import type {
  ApiListingQuery,
  ApiListingSearchQuery,
  ApiSearchSynonymGroupConnection,
  ApiSearchSynonymGroupOrderByInput,
  ApiSearchSynonymGroupWhereInput,
} from "@/graphql/types";

export interface SearchSynonymGroupsQueryData {
  listingQuery: Pick<ApiListingQuery, "search"> & {
    search: Pick<ApiListingSearchQuery, "synonymGroups"> & {
      synonymGroups: ApiSearchSynonymGroupConnection;
    };
  };
}

export interface SearchSynonymGroupsQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiSearchSynonymGroupWhereInput | null;
  orderBy?: ApiSearchSynonymGroupOrderByInput[] | null;
}
