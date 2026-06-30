import type {
  ApiFacet,
  ApiFacetCreateInput,
  ApiFacetCreatePayload,
  ApiFacetDeleteInput,
  ApiFacetDeletePayload,
  ApiFacetMoveInput,
  ApiFacetMovePayload,
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
  "id" | "label" | "sortIndex" | "enabled"
> & {
  slug: string;
  sourceValues: Array<Pick<ApiFacetValue, "handle">>;
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
  values: FacetValueGridFields[];
};

export type FacetValueDetailsFields = FacetValueGridFields & {
  facet: Pick<ApiFacet, "id" | "label" | "facetType">;
};

export interface FacetGridQueryData {
  catalogQuery: {
    facets: FacetGridFields[];
  };
}

export interface FacetDetailsQueryData {
  catalogQuery: {
    facet: FacetGridFields | null;
  };
}

export interface FacetDetailsQueryVariables {
  id: string;
}

export interface FacetValueDetailsQueryData {
  catalogQuery: {
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
  catalogQuery: {
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
  catalogQuery: {
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
  catalogMutation: {
    facetCreate: Omit<ApiFacetCreatePayload, "facet"> & {
      facet: FacetGridFields | null;
    };
  };
}

export interface FacetCreateMutationVariables {
  input: ApiFacetCreateInput;
}

export interface FacetUpdateMutationData {
  catalogMutation: {
    facetUpdate: Omit<ApiFacetUpdatePayload, "facet"> & {
      facet: FacetGridFields | null;
    };
  };
}

export interface FacetUpdateMutationVariables {
  input: ApiFacetUpdateInput;
}

export interface FacetDeleteMutationData {
  catalogMutation: {
    facetDelete: ApiFacetDeletePayload;
  };
}

export interface FacetDeleteMutationVariables {
  input: ApiFacetDeleteInput;
}

export interface FacetMoveMutationData {
  catalogMutation: {
    facetMove: Omit<ApiFacetMovePayload, "facet"> & {
      facet: FacetGridFields | null;
    };
  };
}

export interface FacetMoveMutationVariables {
  input: ApiFacetMoveInput;
}

export interface FacetValueCreateMutationData {
  catalogMutation: {
    facetValueCreate: Omit<ApiFacetValueCreatePayload, "facetValue"> & {
      facetValue: (FacetValueGridFields & { facet: Pick<ApiFacet, "id"> }) | null;
    };
  };
}

export interface FacetValueCreateMutationVariables {
  input: ApiFacetValueCreateInput;
}

export interface FacetValueUpdateMutationData {
  catalogMutation: {
    facetValueUpdate: Omit<ApiFacetValueUpdatePayload, "facetValue"> & {
      facetValue: (FacetValueGridFields & { facet: Pick<ApiFacet, "id"> }) | null;
    };
  };
}

export interface FacetValueUpdateMutationVariables {
  input: ApiFacetValueUpdateInput;
}

export interface FacetValueDeleteMutationData {
  catalogMutation: {
    facetValueDelete: ApiFacetValueDeletePayload;
  };
}

export interface FacetValueDeleteMutationVariables {
  input: ApiFacetValueDeleteInput;
}

export interface FacetSwatchCreateMutationData {
  catalogMutation: {
    facetSwatchCreate: Omit<ApiFacetSwatchCreatePayload, "facetSwatch"> & {
      facetSwatch: FacetSwatchFields | null;
    };
  };
}

export interface FacetSwatchCreateMutationVariables {
  input: ApiFacetSwatchCreateInput;
}

export interface FacetSwatchUpdateMutationData {
  catalogMutation: {
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

export interface FacetSwatchMutationResult {
  facetSwatch: FacetSwatchFields | null;
  userErrors: ApiGenericUserError[];
}
