import { gql } from '@apollo/client';

export const CartFragment = gql`
  fragment CartFragment on Cart {
    id
    createdAt
    updatedAt
    baseCurrencyCode
    displayCurrencyCode
    displayExchangeRate
    subtotalAmount
    discountTotalAmount
    taxTotalAmount
    shippingTotalAmount
    grandTotalAmount
    totalQuantity
  }
`;

export const CartItemFragment = gql`
  fragment CartItemFragment on CartItem {
    id
    totalAmount
    purchasableSnapshot {
      title
      cover {
        ...FileFragment
      }
      price
      sku
      options {
        groupTitle
        title
      }
    }
  }
`;
