import { gql } from "@apollo/client";

export const CUSTOMER_SEGMENT_LIST_FRAGMENT = gql`
  fragment CustomerSegmentListFields on CustomerSegment {
    id
    version
    name
    description
    color
    type
    memberCount
    createdAt
    updatedAt
  }
`;

export const CUSTOMER_SEGMENT_DETAILS_FRAGMENT = gql`
  fragment CustomerSegmentDetailsFields on CustomerSegment {
    ...CustomerSegmentListFields
    members(first: 250) {
      edges {
        cursor
        node {
          id
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
  ${CUSTOMER_SEGMENT_LIST_FRAGMENT}
`;
