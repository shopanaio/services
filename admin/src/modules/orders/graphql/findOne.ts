import { gql } from '@apollo/client';

export const OrderQueryFindOne = gql`
  query FindOneOrder($id: ID!) {
    orderQuery {
      findOne(id: $id) {
        customerMeta
        adminNote
        # --
        ...OrderFragment
        createdBy {
          ... on User {
            ...UserFragment
          }
        }
        orderItems {
          id
          createdAt
          discountAmount
          originalQuantity
          price
          productCostPrice
          quantity
          subtotalAmount
          taxAmount
          totalAmount
          weight {
            weight
            unit
          }
          productInfo {
            id
            variantId
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
        }
        fulfillments {
          id
          createdAt
          parentId
          status
          items {
            orderItemId
            quantity
          }
          shippingItem {
            id
            trackingCode
            shippingMethod {
              code
              name
              service {
                code
                name
                cover {
                  ...FileFragment
                }
              }
            }
          }
        }

        customer {
          ...CustomerFragment
        }
        customerStatistic {
          totalRevenue
          totalGuestOrders
          totalAuthorizedOrders
        }
        events {
          id
          eventType
          eventData
          createdAt
          createdBy {
            ... on User {
              ...UserFragment
            }
          }
        }
      }
    }
  }
`;
