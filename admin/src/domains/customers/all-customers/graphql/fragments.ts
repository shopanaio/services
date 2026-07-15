import { gql } from "@apollo/client";

export const CUSTOMER_LIST_FRAGMENT = gql`
  fragment CustomerListFields on Customer {
    id
    version
    displayName
    firstName
    lastName
    email
    phone
    status
    emailMarketingState
    segments {
      id
      name
    }
    defaultAddress {
      id
      city
      countryCode
    }
    activity {
      ordersCount
      totalSpentMinor
      averageOrderValueMinor
      returnsCount
      lastOrderAt
    }
    moderation {
      riskLevel
      complaintCount
      lastComplaintAt
    }
    createdAt
    updatedAt
  }
`;

export const CUSTOMER_DETAILS_FRAGMENT = gql`
  fragment CustomerDetailsFields on Customer {
    ...CustomerListFields
    locale
    taxExempt
    tags
    note
    smsMarketingState
    defaultAddress {
      id
      address1
      address2
      city
      province
      postalCode
      countryCode
    }
    moderation {
      riskLevel
      complaintCount
      lastComplaintAt
      blockedReason
      moderationNote
    }
  }
  ${CUSTOMER_LIST_FRAGMENT}
`;
