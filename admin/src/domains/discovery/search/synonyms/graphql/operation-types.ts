import type {
  ApiListingQuery,
  ApiListingSearchQuery,
  ApiSearchSettings,
  ApiSearchSynonymGroup,
  ApiSearchSynonymGroupConnection,
  ApiSearchSynonymGroupOrderByInput,
  ApiSearchSynonymGroupCreateInput,
  ApiSearchSynonymGroupPayload,
  ApiSearchSynonymGroupUpdateInput,
  ApiSearchSynonymGroupWhereInput,
} from "@/graphql/types";

export interface SearchSynonymGroupsQueryData {
  listingQuery: Pick<ApiListingQuery, "search"> & {
    search: Pick<ApiListingSearchQuery, "synonymGroups"> & {
      synonymGroups: ApiSearchSynonymGroupConnection;
    };
  };
}

export interface SearchSynonymGroupCreateMutationData {
  listingMutation: { search: { synonymGroupCreate: ApiSearchSynonymGroupPayload } };
}

export interface SearchSynonymGroupCreateMutationVariables {
  input: ApiSearchSynonymGroupCreateInput;
}

export interface SearchSynonymGroupUpdateMutationData {
  listingMutation: { search: { synonymGroupUpdate: ApiSearchSynonymGroupPayload } };
}

export interface SearchSynonymGroupUpdateMutationVariables {
  input: ApiSearchSynonymGroupUpdateInput;
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
