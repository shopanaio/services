import type {
  ApiListingQuery,
  ApiListingSearchQuery,
  ApiSearchSettings,
  ApiSearchSynonymGroup,
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

export interface SearchSynonymGroupEditorQueryData {
  listingQuery: Pick<ApiListingQuery, "search"> & {
    search: Pick<ApiListingSearchQuery, "settings" | "synonymGroup"> & {
      settings?: ApiSearchSettings | null;
      synonymGroup?: ApiSearchSynonymGroup | null;
    };
  };
}

export interface SearchSynonymGroupEditorQueryVariables {
  id: string;
}

export interface SearchSynonymGroupsQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiSearchSynonymGroupWhereInput | null;
  orderBy?: ApiSearchSynonymGroupOrderByInput[] | null;
}
