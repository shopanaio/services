import { gql } from "@apollo/client";

export const CUSTOMER_SEGMENT_LIST_FRAGMENT = gql`
  fragment CustomerSegmentListFields on CustomerSegment {
    id
    revision
    name
    description
    color
    type
    status
    customersCount
    createdAt
    updatedAt
  }
`;

export const CUSTOMER_SEGMENT_DETAILS_FRAGMENT = gql`
  fragment CustomerSegmentDetailsFields on CustomerSegment {
    ...CustomerSegmentListFields
    customerMemberships(first: 250, where: { source: { _eq: MANUAL } }) {
      edges {
        cursor
        node {
          id
          customer {
            id
          }
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
