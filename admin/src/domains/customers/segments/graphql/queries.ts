import { gql } from "@apollo/client";
import {
  CUSTOMER_SEGMENT_DETAILS_FRAGMENT,
  CUSTOMER_SEGMENT_LIST_FRAGMENT,
} from "./fragments";

export const CUSTOMER_SEGMENTS_QUERY = gql`
  query CustomerSegments(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: CustomerSegmentWhereInput
    $orderBy: [CustomerSegmentOrderByInput!]
  ) {
    customersQuery {
      customerSegments(
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
            ...CustomerSegmentListFields
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
  ${CUSTOMER_SEGMENT_LIST_FRAGMENT}
`;

export const CUSTOMER_SEGMENT_QUERY = gql`
  query CustomerSegment($id: ID!) {
    customersQuery {
      customerSegment(id: $id) {
        ...CustomerSegmentDetailsFields
      }
    }
  }
  ${CUSTOMER_SEGMENT_DETAILS_FRAGMENT}
`;
