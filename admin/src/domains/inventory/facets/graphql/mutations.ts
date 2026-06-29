import { gql } from "@apollo/client";
import { USER_ERROR_FRAGMENT } from "../../graphql/shared-fragments";
import {
  FACET_GRID_FRAGMENT,
  FACET_SWATCH_FRAGMENT,
  FACET_VALUE_GRID_FRAGMENT,
} from "./fragments";

export const FACET_CREATE_MUTATION = gql`
  mutation FacetCreate($input: FacetCreateInput!) {
    catalogMutation {
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
    catalogMutation {
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

export const FACET_DELETE_MUTATION = gql`
  mutation FacetDelete($input: FacetDeleteInput!) {
    catalogMutation {
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

export const FACET_VALUE_CREATE_MUTATION = gql`
  mutation FacetValueCreate($input: FacetValueCreateInput!) {
    catalogMutation {
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
    catalogMutation {
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
    catalogMutation {
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

export const FACET_SWATCH_CREATE_MUTATION = gql`
  mutation FacetSwatchCreate($input: FacetSwatchCreateInput!) {
    catalogMutation {
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
    catalogMutation {
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
