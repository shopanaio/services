import { gql } from "@apollo/client";
import { FACET_GRID_FRAGMENT, FACET_VALUE_GRID_FRAGMENT } from "./fragments";

export const FACET_GRID_QUERY = gql`
  query FacetGrid {
    catalogQuery {
      facets {
        ...FacetGridFields
      }
    }
  }
  ${FACET_GRID_FRAGMENT}
`;

export const FACET_DETAILS_QUERY = gql`
  query FacetDetails($id: ID!) {
    catalogQuery {
      facet(id: $id) {
        ...FacetGridFields
      }
    }
  }
  ${FACET_GRID_FRAGMENT}
`;

export const FACET_VALUE_DETAILS_QUERY = gql`
  query FacetValueDetails($id: ID!) {
    catalogQuery {
      facetValue(id: $id) {
        ...FacetValueGridFields
        facet {
          id
          label
          facetType
        }
      }
    }
  }
  ${FACET_VALUE_GRID_FRAGMENT}
`;
