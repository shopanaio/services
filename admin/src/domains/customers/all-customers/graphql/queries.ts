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
