import type {
  ApiCatalogMutation,
  ApiCatalogQuery,
  ApiGenericUserError,
  ApiTag,
  ApiTagConnection,
  ApiTagCreateInput,
  ApiTagCreatePayload,
  ApiTagUpdateInput,
  ApiTagUpdatePayload,
} from "@/graphql/types";

export interface TagsQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "tags"> & {
    tags: ApiTagConnection;
  };
}

export interface TagsQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
}

export interface TagDetailsQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "tag"> & {
    tag: ApiTag | null;
  };
}

export interface TagDetailsQueryVariables {
  id: string;
}

export interface TagCreateMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "tagCreate"> & {
    tagCreate: ApiTagCreatePayload;
  };
}

export interface TagCreateMutationVariables {
  input: ApiTagCreateInput;
}

export interface TagUpdateMutationData {
  catalogMutation: Pick<ApiCatalogMutation, "tagUpdate"> & {
    tagUpdate: ApiTagUpdatePayload;
  };
}

export interface TagUpdateMutationVariables {
  input: ApiTagUpdateInput;
}

export interface TagMutationResult {
  tag: ApiTag | null;
  userErrors: ApiGenericUserError[];
}
