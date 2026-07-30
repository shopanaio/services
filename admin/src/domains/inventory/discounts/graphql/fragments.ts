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
    codesCount
    method
    kind
    discountClass
    currency
    state
    effectiveStatus
    priority
    usageLimit
    reservedUsageCount
    usageCount
    appliesOncePerCustomer
    appliesOnOneTimePurchase
    appliesOnSubscription
    startsAt
    endsAt
    tags
    channelCodes
    featuredChannelCodes
    combinesWithProductDiscounts
    combinesWithOrderDiscounts
    combinesWithShippingDiscounts
    createdById
    createdAt
    updatedAt
    archivedAt

    rule {
      __typename
      ... on DiscountAmountOffRule {
        operation
        valueType
        percentageBps
        amountMinor
        allocationMethod
        maximumDiscountMinor
      }
      ... on DiscountBuyXGetYRule {
        requirementType
        requiredQuantity
        requiredSubtotalMinor
        benefitQuantity
        benefitStrategy
        benefitOperation
        benefitValueType
        benefitPercentageBps
        benefitAmountMinor
        usesPerOrderLimit
      }
      ... on DiscountFreeShippingRule {
        maximumShippingPriceMinor
      }
    }

    minimumRequirement {
      requirementType
      subtotalMinor
      quantity
    }

    targetSelections {
      role
      targetType
      targets {
        targetId
        targetType
        referenceStatus
        referenceStatusChangedAt
        referenceCheckedAt
        createdAt
        target {
          __typename
          ... on Product {
            id
            title
            handle
          }
          ... on Variant {
            id
            handle
            product {
              id
              title
            }
            inventoryItem {
              sku
            }
          }
          ... on Category {
            id
            name
            handle
          }
        }
      }
    }

    buyerContext {
      type
      createdAt
      updatedAt
      customers {
        customerId
        referenceStatus
        referenceStatusChangedAt
        referenceCheckedAt
        createdAt
        customer {
          id
          displayName
          email
        }
      }
      segments {
        segmentId
        referenceStatus
        referenceStatusChangedAt
        referenceCheckedAt
        createdAt
      }
    }

    channels {
      code
      featured
      createdAt
      updatedAt
    }

    combinations {
      discountClass
      createdAt
    }

    usage {
      usageLimit
      reservedCount
      committedCount
      reversedCount
      netCommittedCount
      consumedCount
      remainingCount
      version
      updatedAt
    }

    codes(first: 20, orderBy: [{ field: updatedAt, direction: desc }]) {
      totalCount
      edges {
        node {
          id
          code
          normalizedCode
          status
          usageLimit
          reservedCount
          committedCount
          reversedCount
          usageCount
          remainingCount
          createdAt
          updatedAt
          disabledAt
        }
      }
    }

    redemptions(
      first: 100
      orderBy: [{ field: committedAt, direction: desc }]
    ) {
      totalCount
      edges {
        node {
          id
          orderId
          status
          amountMinor
          committedAt
          reversedAt
        }
      }
    }

    externalReferences(
      first: 20
      orderBy: [{ field: updatedAt, direction: desc }]
    ) {
      totalCount
      edges {
        node {
          id
          externalSystem
          externalType
          externalId
          externalUrl
          direction
          syncStatus
          lastSyncedAt
          lastError
          createdAt
          updatedAt
        }
      }
    }
  }
`;
