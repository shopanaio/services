import { gql } from '@apollo/client';

export const OrderQueryFindMany = gql`
  query FindManyOrders($input: OrdersInput!) {
    orderQuery {
      findMany(input: $input) {
        meta {
          page
          pageSize
          count
          total
          pageCount
        }
        data {
          ...OrderFragment
          productsInfo {
            id
            snapshot {
              title
              containerTitle
              cover {
                ...FileFragment
              }
              price
              sku
              options {
                groupTitle
                title
                # value
              }
            }
          }
          fulfillments {
            id
            status
          }
        }
      }
    }
  }
`;
