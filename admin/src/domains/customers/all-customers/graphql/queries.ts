import { gql } from "@apollo/client";
import { CUSTOMER_DETAILS_FRAGMENT, CUSTOMER_LIST_FRAGMENT } from "./fragments";

export const CUSTOMERS_QUERY = gql`
  query Customers(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: CustomerWhereInput
    $orderBy: [CustomerOrderByInput!]
    $currencyCode: String
  ) {
    customersQuery {
      customers(
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
            ...CustomerListFields
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
  ${CUSTOMER_LIST_FRAGMENT}
`;

export const CUSTOMER_QUERY = gql`
  query Customer($id: ID!) {
    customersQuery {
      customer(id: $id) {
        ...CustomerDetailsFields
      }
    }
  }
  ${CUSTOMER_DETAILS_FRAGMENT}
`;

export const CUSTOMER_EDITOR_CONTEXT_QUERY = gql`
  query CustomerEditorContext {
    customersQuery {
      customerSegments(first: 250, where: { type: { _eq: MANUAL }, status: { _eq: ACTIVE } }) {
        edges {
          node {
            id
            name
          }
        }
      }
      customerTags(first: 250) {
        edges {
          node {
            id
            name
          }
        }
      }
      customerGroups(first: 250, where: { isActive: { _eq: true } }) {
        edges {
          node {
            id
            code
            name
            isDefault
          }
        }
      }
    }
  }
`;
