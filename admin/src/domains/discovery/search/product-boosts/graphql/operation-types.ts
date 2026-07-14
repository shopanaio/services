import type {
  ApiListingQuery,
  ApiListingSearchQuery,
  ApiSearchSettings,
  ApiSearchProductBoost,
  ApiSearchProductBoostConnection,
  ApiSearchProductBoostsMetaInput,
  ApiSearchProductBoostOrderByInput,
  ApiSearchProductBoostCreateInput,
  ApiSearchProductBoostPayload,
  ApiSearchProductBoostUpdateInput,
  ApiSearchProductBoostWhereInput,
  ApiSearchConfigurationDeleteInput,
} from "@/graphql/types";

export interface SearchProductBoostsQueryData {
  listingQuery: Pick<ApiListingQuery, "search"> & {
    search: Pick<ApiListingSearchQuery, "productBoosts"> & {
      productBoosts: ApiSearchProductBoostConnection;
    };
  };
}

export interface SearchProductBoostCreateMutationData {
  listingMutation: { search: { productBoostCreate: ApiSearchProductBoostPayload } };
}

export interface SearchProductBoostCreateMutationVariables {
  input: ApiSearchProductBoostCreateInput;
}

export interface SearchProductBoostUpdateMutationData {
  listingMutation: { search: { productBoostUpdate: ApiSearchProductBoostPayload } };
}

export interface SearchProductBoostUpdateMutationVariables {
  input: ApiSearchProductBoostUpdateInput;
}

export interface SearchProductBoostDeleteMutationData {
  listingMutation: { search: { productBoostDelete: ApiSearchProductBoostPayload } };
}

export interface SearchProductBoostDeleteMutationVariables {
  input: ApiSearchConfigurationDeleteInput;
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
  meta?: ApiSearchProductBoostsMetaInput | null;
}
