import { gql } from '@apollo/client';

export const OrderFragment = gql`
  fragment OrderFragment on Order {
    id
    createdAt
    updatedAt
    status
    orderNumber
    externalSystemId
    currencyCode
    displayCurrencyCode
    displayExchangeRate
    totalShippingAmount
    totalRefundedAmount
    totalDiscountAmount
    totalTaxAmount
    totalAmount
    subtotalAmount
    customerNote
    customerEmail
    customerPhone
    customerFirstName
    customerMiddleName
    customerLastName
    tags {
      ...TagFragment
    }
    paymentMethod {
      ...PaymentMethodFragment
    }
    shippingMethod {
      ...ShippingMethodFragment
    }
    shippingAddress {
      ...AddressFragment
    }
    billingAddress {
      ...AddressFragment
    }
    payment {
      ...PaymentItemFragment
    }
  }
`;

export const OrderItemFragment = gql`
  fragment OrderItemFragment on OrderItem {
    id
    taxAmount
    totalAmount
    price
    quantity
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
    weight {
      weight
      unit
    }
    discountAmount
    subtotalAmount
    createdAt
    originalQuantity
    productCostPrice
  }
`;

export const ShippingServiceFragment = gql`
  fragment ShippingServiceFragment on ShippingService {
    code
    name
    cover {
      ...FileFragment
    }
  }
`;

export const PaymentServiceFragment = gql`
  fragment PaymentServiceFragment on PaymentService {
    code
    name
    cover {
      ...FileFragment
    }
  }
`;

export const PaymentMethodFragment = gql`
  fragment PaymentMethodFragment on PaymentMethod {
    code
    name
    service {
      ...PaymentServiceFragment
    }
  }
`;

export const ShippingMethodFragment = gql`
  fragment ShippingMethodFragment on ShippingMethod {
    code
    name
    service {
      ...ShippingServiceFragment
    }
  }
`;

export const ShippingItemFragment = gql`
  fragment ShippingItemFragment on ShippingItem {
    id
    createdAt
    trackingUrl
    estimatedDeliveryAt
    shippingMethod {
      ...ShippingMethodFragment
    }
    notificationsEnabled
    shippingPrice
    trackingCode
    trackingData
    trackingEnabled
  }
`;

export const PaymentItemFragment = gql`
  fragment PaymentItemFragment on PaymentItem {
    id
    createdAt
    amount
    paymentMethod {
      ...PaymentMethodFragment
    }
    status
  }
`;

export const AddressFragment = gql`
  fragment AddressFragment on Address {
    id
    address1
    address2
    city
    countryCode
    firstName
    lastName
    latitude
    longitude
    postalCode
    provinceCode
    email
    middleName
    phone
  }
`;
