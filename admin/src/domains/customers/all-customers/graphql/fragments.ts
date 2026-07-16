import { gql } from "@apollo/client";

export const CUSTOMER_LIST_FRAGMENT = gql`
  fragment CustomerListFields on Customer {
    id
    revision
    displayName
    firstName
    lastName
    email
    phoneE164
    lifecycleStatus
    consents {
      id
      channel
      state
      contactPoint
    }
    defaultShippingAddress {
      id
      city
      countryCode
    }
    statistics {
      ordersCount
      returnsCount
      lastOrderAt
    }
    monetaryStatistics(first: 1, where: { currencyCode: { _eq: $currencyCode } }) {
      edges {
        node {
          id
          currencyCode
          totalSpentMinor
          averageOrderValueMinor
        }
      }
    }
    createdAt
    updatedAt
  }
`;

export const CUSTOMER_DETAILS_FRAGMENT = gql`
  fragment CustomerDetailsFields on Customer {
    ...CustomerListFields
    preferredLocale
    note
    blockedReason
    moderationNote
    segmentMemberships(first: 250) {
      edges {
        node {
          id
          segment {
            id
            name
          }
        }
      }
    }
    tagAssignments(first: 250) {
      edges {
        node {
          id
          tag {
            id
            name
          }
        }
      }
    }
    defaultShippingAddress {
      id
      address1
      address2
      city
      regionName
      postalCode
      countryCode
    }
  }
  ${CUSTOMER_LIST_FRAGMENT}
`;
