import type {
  ApiFacet,
  ApiFacetCreateInput,
  ApiFacetCreatePayload,
  ApiFacetDeleteInput,
  ApiFacetDeletePayload,
  ApiFacetMoveInput,
  ApiFacetMovePayload,
  ApiFacetSource,
  ApiFacetSourceCandidate,
  ApiFacetSourceCandidateConnection,
  ApiFacetSourceCandidateOrderByInput,
  ApiFacetSourceCandidateWhereInput,
  ApiFacetSwatch,
  ApiFacetSwatchCreateInput,
  ApiFacetSwatchCreatePayload,
  ApiFacetSwatchUpdateInput,
  ApiFacetSwatchUpdatePayload,
  ApiFacetUpdateInput,
  ApiFacetUpdatePayload,
  ApiFacetValue,
  ApiFacetValueCandidate,
  ApiFacetValueCandidateConnection,
  ApiFacetValueCandidateOrderByInput,
  ApiFacetValueCandidateWhereInput,
  ApiFacetValueCandidatesMetaInput,
  ApiFacetValueCreateInput,
  ApiFacetValueCreatePayload,
  ApiFacetValueDeleteInput,
  ApiFacetValueDeletePayload,
  ApiFacetValueMergeInput,
  ApiFacetValueMergePayload,
  ApiFacetValueUnmergeInput,
  ApiFacetValueUnmergePayload,
  ApiFacetValueUpdateInput,
  ApiFacetValueUpdatePayload,
  ApiFile,
  ApiGenericUserError,
} from "@/graphql/types";

export type FacetSwatchFields = Pick<
  ApiFacetSwatch,
  "id" | "swatchType" | "colorOne" | "colorTwo" | "metadata"
> & {
  file: ApiFile | null;
};

export type FacetValueGridFields = Pick<
  ApiFacetValue,
  "id" | "label" | "handle" | "kind" | "sortIndex" | "enabled"
> & {
  parent: Pick<ApiFacetValue, "id" | "label" | "handle"> | null;
  sourceValues: Array<Pick<ApiFacetValue, "id" | "label" | "handle">>;
  swatch: FacetSwatchFields | null;
};

export type FacetGridFields = Pick<
  ApiFacet,
  | "id"
  | "label"
  | "slug"
  | "facetType"
  | "uiType"
  | "selectionMode"
  | "lexoRank"
> & {
  sources: Array<Pick<ApiFacetSource, "handle" | "name">>;
  values: FacetValueGridFields[];
};

export type FacetValueDetailsFields = FacetValueGridFields & {
  facet: Pick<ApiFacet, "id" | "label" | "facetType">;
};

export interface FacetGridQueryData {
  listingQuery: {
    facets: FacetGridFields[];
  };
}

export interface FacetDetailsQueryData {
  listingQuery: {
    facet: FacetGridFields | null;
  };
}

export interface FacetDetailsQueryVariables {
  id: string;
}

export interface FacetValueDetailsQueryData {
  listingQuery: {
    facetValue: FacetValueDetailsFields | null;
  };
}

export interface FacetValueDetailsQueryVariables {
  id: string;
}

export type FacetSourceCandidateFields = Pick<
  ApiFacetSourceCandidate,
  "id" | "facetType" | "handle" | "name"
>;

export type FacetSourceCandidateConnectionFields = Pick<
  ApiFacetSourceCandidateConnection,
  "pageInfo" | "totalCount"
> & {
  edges: Array<{
    cursor: string;
    node: FacetSourceCandidateFields;
  }>;
};

export interface FacetSourceCandidatesQueryData {
  listingQuery: {
    facetSourceCandidates: FacetSourceCandidateConnectionFields;
  };
}

export interface FacetSourceCandidatesQueryVariables {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  where?: ApiFacetSourceCandidateWhereInput | null;
  orderBy?: ApiFacetSourceCandidateOrderByInput[] | null;
}

export type FacetValueCandidateFields = Pick<
  ApiFacetValueCandidate,
  "id" | "facetType" | "sourceHandle" | "handle" | "label"
>;

export type FacetValueCandidateConnectionFields = Pick<
  ApiFacetValueCandidateConnection,
  "pageInfo" | "totalCount"
> & {
  edges: Array<{
    cursor: string;
    node: FacetValueCandidateFields;
  }>;
};

export interface FacetValueCandidatesQueryData {
  listingQuery: {
    facetValueCandidates: FacetValueCandidateConnectionFields;
  };
}

export interface FacetValueCandidatesQueryVariables {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  where?: ApiFacetValueCandidateWhereInput | null;
  orderBy?: ApiFacetValueCandidateOrderByInput[] | null;
  meta: ApiFacetValueCandidatesMetaInput;
}

export interface FacetCreateMutationData {
  listingMutation: {
    facetCreate: Omit<ApiFacetCreatePayload, "facet"> & {
      facet: FacetGridFields | null;
    };
  };
}

export interface FacetCreateMutationVariables {
  input: ApiFacetCreateInput;
}

export interface FacetUpdateMutationData {
  listingMutation: {
    facetUpdate: Omit<ApiFacetUpdatePayload, "facet"> & {
      facet: FacetGridFields | null;
    };
  };
}

export interface FacetUpdateMutationVariables {
  input: ApiFacetUpdateInput;
}

export interface FacetDeleteMutationData {
  listingMutation: {
    facetDelete: ApiFacetDeletePayload;
  };
}

export interface FacetDeleteMutationVariables {
  input: ApiFacetDeleteInput;
}

export interface FacetMoveMutationData {
  listingMutation: {
    facetMove: Omit<ApiFacetMovePayload, "facet"> & {
      facet: FacetGridFields | null;
    };
  };
}

export interface FacetMoveMutationVariables {
  input: ApiFacetMoveInput;
}

export interface FacetValueCreateMutationData {
  listingMutation: {
    facetValueCreate: Omit<ApiFacetValueCreatePayload, "facetValue"> & {
      facetValue: (FacetValueGridFields & { facet: Pick<ApiFacet, "id"> }) | null;
    };
  };
}

export interface FacetValueCreateMutationVariables {
  input: ApiFacetValueCreateInput;
}

export interface FacetValueUpdateMutationData {
  listingMutation: {
    facetValueUpdate: Omit<ApiFacetValueUpdatePayload, "facetValue"> & {
      facetValue: (FacetValueGridFields & { facet: Pick<ApiFacet, "id"> }) | null;
    };
  };
}

export interface FacetValueUpdateMutationVariables {
  input: ApiFacetValueUpdateInput;
}

export interface FacetValueDeleteMutationData {
  listingMutation: {
    facetValueDelete: ApiFacetValueDeletePayload;
  };
}

export interface FacetValueDeleteMutationVariables {
  input: ApiFacetValueDeleteInput;
}

export interface FacetValueMergeMutationData {
  listingMutation: {
    facetValueMerge: Omit<
      ApiFacetValueMergePayload,
      "facetValue" | "sourceValues"
    > & {
      facetValue: (FacetValueGridFields & { facet: Pick<ApiFacet, "id"> }) | null;
      sourceValues: FacetValueGridFields[];
    };
  };
}

export interface FacetValueMergeMutationVariables {
  input: ApiFacetValueMergeInput;
}

export interface FacetValueUnmergeMutationData {
  listingMutation: {
    facetValueUnmerge: Omit<
      ApiFacetValueUnmergePayload,
      "sourceValues" | "affectedDisplayValues"
    > & {
      sourceValues: FacetValueGridFields[];
      affectedDisplayValues: FacetValueGridFields[];
    };
  };
}

export interface FacetValueUnmergeMutationVariables {
  input: ApiFacetValueUnmergeInput;
}

export interface FacetSwatchCreateMutationData {
  listingMutation: {
    facetSwatchCreate: Omit<ApiFacetSwatchCreatePayload, "facetSwatch"> & {
      facetSwatch: FacetSwatchFields | null;
    };
  };
}

export interface FacetSwatchCreateMutationVariables {
  input: ApiFacetSwatchCreateInput;
}

export interface FacetSwatchUpdateMutationData {
  listingMutation: {
    facetSwatchUpdate: Omit<ApiFacetSwatchUpdatePayload, "facetSwatch"> & {
      facetSwatch: FacetSwatchFields | null;
    };
  };
}

export interface FacetSwatchUpdateMutationVariables {
  input: ApiFacetSwatchUpdateInput;
}

export interface FacetMutationResult {
  facet: FacetGridFields | null;
  userErrors: ApiGenericUserError[];
}

export interface FacetValueMutationResult {
  facetValue:
    | (FacetValueGridFields & { facet?: Pick<ApiFacet, "id"> | null })
    | null;
  userErrors: ApiGenericUserError[];
}

export interface FacetValueMergeMutationResult {
  facetValue:
    | (FacetValueGridFields & { facet?: Pick<ApiFacet, "id"> | null })
    | null;
  sourceValues: FacetValueGridFields[];
  userErrors: ApiGenericUserError[];
}

export interface FacetValueUnmergeMutationResult {
  sourceValues: FacetValueGridFields[];
  affectedDisplayValues: FacetValueGridFields[];
  userErrors: ApiGenericUserError[];
}

export interface FacetSwatchMutationResult {
  facetSwatch: FacetSwatchFields | null;
  userErrors: ApiGenericUserError[];
}
