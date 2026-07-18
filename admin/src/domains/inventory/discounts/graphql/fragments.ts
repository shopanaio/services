import { gql } from "@apollo/client";

export const DISCOUNT_LIST_FRAGMENT = gql`
  fragment DiscountListFields on Discount {
    id
    title
    primaryCode
    codesCount
    method
    kind
    discountClass
    effectiveStatus
    currency
    priority
    usageLimit
    reservedUsageCount
    usageCount
    startsAt
    endsAt
    tags
    channelCodes
    updatedAt
  }
`;

export const DISCOUNT_DETAILS_FRAGMENT = gql`
  fragment DiscountDetailsFields on Discount {
    id
    revision
    title
    primaryCode
    method
    kind
    discountClass
    currency
    state
    effectiveStatus
    createdAt
    updatedAt
    archivedAt
  }
`;
