import { gql } from "@apollo/client";
import { DISCOUNT_LIST_FRAGMENT } from "./fragments";

export const DISCOUNTS_QUERY = gql`
  query Discounts(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: DiscountWhereInput
    $orderBy: [DiscountOrderByInput!]
  ) {
    pricingQuery {
      discounts(
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
            ...DiscountListFields
          }
        }
        pageInfo {
          startCursor
          endCursor
          hasPreviousPage
          hasNextPage
        }
        totalCount
      }
    }
  }
  ${DISCOUNT_LIST_FRAGMENT}
`;
