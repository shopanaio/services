import type {
  ApiListingMutation,
  ApiListingQuery,
  ApiSearchSettings,
  ApiSearchSettingsOperationsInput,
  ApiSearchSettingsUpdatePayload,
} from "@/graphql/types";

export interface SearchSettingsEditorQueryData {
  listingQuery: Pick<ApiListingQuery, "search"> & {
    search: { settings?: ApiSearchSettings | null };
  };
}

export interface SearchSettingsUpdateMutationData {
  listingMutation: Pick<ApiListingMutation, "search"> & {
    search: { settingsUpdate: ApiSearchSettingsUpdatePayload };
  };
}

export interface SearchSettingsUpdateMutationVariables {
  operations: ApiSearchSettingsOperationsInput;
}
