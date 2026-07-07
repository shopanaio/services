import { gql } from "@apollo/client";
import { FACET_GRID_FRAGMENT, FACET_VALUE_GRID_FRAGMENT } from "./fragments";

export const FACET_GRID_QUERY = gql`
  query FacetGrid {
    listingQuery {
      facets {
        ...FacetGridFields
      }
    }
  }
  ${FACET_GRID_FRAGMENT}
`;

export const FACET_DETAILS_QUERY = gql`
  query FacetDetails($id: ID!) {
    listingQuery {
      facet(id: $id) {
        ...FacetGridFields
      }
    }
  }
  ${FACET_GRID_FRAGMENT}
`;

export const FACET_VALUE_DETAILS_QUERY = gql`
  query FacetValueDetails($id: ID!) {
    listingQuery {
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

export const FACET_SOURCE_CANDIDATES_QUERY = gql`
  query FacetSourceCandidates(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: FacetSourceCandidateWhereInput
    $orderBy: [FacetSourceCandidateOrderByInput!]
  ) {
    listingQuery {
      facetSourceCandidates(
        first: $first
        after: $after
        last: $last
        before: $before
        where: $where
        orderBy: $orderBy
      ) {
        edges {
          cursor
          node {
            id
            facetType
            handle
            name
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        totalCount
      }
    }
  }
`;

export const FACET_VALUE_CANDIDATES_QUERY = gql`
  query FacetValueCandidates(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: FacetValueCandidateWhereInput
    $orderBy: [FacetValueCandidateOrderByInput!]
    $meta: FacetValueCandidatesMetaInput!
  ) {
    listingQuery {
      facetValueCandidates(
        first: $first
        after: $after
        last: $last
        before: $before
        where: $where
        orderBy: $orderBy
        meta: $meta
      ) {
        edges {
          cursor
          node {
            id
            facetType
            sourceHandle
            handle
            label
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        totalCount
      }
    }
  }
`;
