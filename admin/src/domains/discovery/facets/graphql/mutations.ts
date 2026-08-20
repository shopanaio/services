import { gql } from "@apollo/client";
import { USER_ERROR_FRAGMENT } from "@/domains/inventory/graphql/shared-fragments";
import { FACET_GRID_FRAGMENT, FACET_SWATCH_FRAGMENT, FACET_VALUE_GRID_FRAGMENT } from "./fragments";

export const FACET_CREATE_MUTATION = gql`
  mutation FacetCreate($input: FacetCreateInput!) {
    listingMutation {
      facetCreate(input: $input) {
        facet {
          ...FacetGridFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${FACET_GRID_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const FACET_UPDATE_MUTATION = gql`
  mutation FacetUpdate($input: FacetUpdateInput!) {
    listingMutation {
      facetUpdate(input: $input) {
        facet {
          ...FacetGridFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${FACET_GRID_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const FACET_SCOPES_UPDATE_MUTATION = gql`
  mutation FacetScopesUpdate($input: FacetScopesUpdateInput!) {
    listingMutation {
      facetScopesUpdate(input: $input) {
        facets {
          ...FacetGridFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${FACET_GRID_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const FACET_DELETE_MUTATION = gql`
  mutation FacetDelete($input: FacetDeleteInput!) {
    listingMutation {
      facetDelete(input: $input) {
        deletedFacetId
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

export const FACET_MOVE_MUTATION = gql`
  mutation FacetMove($input: FacetMoveInput!) {
    listingMutation {
      facetMove(input: $input) {
        facet {
          ...FacetGridFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${FACET_GRID_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const FACET_VALUE_CREATE_MUTATION = gql`
  mutation FacetValueCreate($input: FacetValueCreateInput!) {
    listingMutation {
      facetValueCreate(input: $input) {
        facetValue {
          ...FacetValueGridFields
          facet {
            id
          }
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${FACET_VALUE_GRID_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const FACET_VALUE_UPDATE_MUTATION = gql`
  mutation FacetValueUpdate($input: FacetValueUpdateInput!) {
    listingMutation {
      facetValueUpdate(input: $input) {
        facetValue {
          ...FacetValueGridFields
          facet {
            id
          }
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${FACET_VALUE_GRID_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const FACET_VALUE_DELETE_MUTATION = gql`
  mutation FacetValueDelete($input: FacetValueDeleteInput!) {
    listingMutation {
      facetValueDelete(input: $input) {
        deletedFacetValueId
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

export const FACET_VALUE_MERGE_MUTATION = gql`
  mutation FacetValueMerge($input: FacetValueMergeInput!) {
    listingMutation {
      facetValueMerge(input: $input) {
        facetValue {
          ...FacetValueGridFields
          facet {
            id
          }
        }
        sourceValues {
          ...FacetValueGridFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${FACET_VALUE_GRID_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const FACET_VALUE_UNMERGE_MUTATION = gql`
  mutation FacetValueUnmerge($input: FacetValueUnmergeInput!) {
    listingMutation {
      facetValueUnmerge(input: $input) {
        sourceValues {
          ...FacetValueGridFields
        }
        affectedGroupValues {
          ...FacetValueGridFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${FACET_VALUE_GRID_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const FACET_SWATCH_CREATE_MUTATION = gql`
  mutation FacetSwatchCreate($input: FacetSwatchCreateInput!) {
    listingMutation {
      facetSwatchCreate(input: $input) {
        facetSwatch {
          ...FacetSwatchFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${FACET_SWATCH_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const FACET_SWATCH_UPDATE_MUTATION = gql`
  mutation FacetSwatchUpdate($input: FacetSwatchUpdateInput!) {
    listingMutation {
      facetSwatchUpdate(input: $input) {
        facetSwatch {
          ...FacetSwatchFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${FACET_SWATCH_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;
