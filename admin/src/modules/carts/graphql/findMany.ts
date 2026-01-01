import { gql } from '@apollo/client';

export const CartQueryFindMany = gql`
  query FindManyCarts($input: CartsInput!) {
    cartQuery {
      findMany(input: $input) {
        meta {
          page
          pageSize
          count
          total
          pageCount
        }
        data {
          ...CartFragment
          items {
            ...CartItemFragment
          }
        }
      }
    }
  }
`;
