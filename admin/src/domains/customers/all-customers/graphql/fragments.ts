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
    id
    revision
    displayName
    firstName
    lastName
    email
    phoneE164
    lifecycleStatus
    defaultShippingAddress {
      id
      label
      prefix
      firstName
      middleName
      lastName
      suffix
      companyName
      phoneE164
      address1
      address2
      city
      regionName
      regionCode
      postalCode
      countryCode
      isDefaultShipping
      isDefaultBilling
      validationStatus
      validatedAt
    }
    defaultBillingAddress {
      id
      label
      prefix
      firstName
      middleName
      lastName
      suffix
      companyName
      phoneE164
      address1
      address2
      city
      regionName
      regionCode
      postalCode
      countryCode
      isDefaultShipping
      isDefaultBilling
      validationStatus
      validatedAt
    }
    createdAt
    updatedAt
    accountStatus
    iamPrincipalId
    emailVerified
    phoneVerified
    prefix
    middleName
    suffix
    preferredLocale
    dateOfBirth
    gender
    companyName
    jobTitle
    note
    blockedReason
    moderationNote
    source
    createdByUserId
    lastActivityAt
    redactedAt
    deletedAt
    mergedInto {
      id
      displayName
      email
    }
    addresses(first: 50) {
      edges {
        node {
          id
          label
          prefix
          firstName
          middleName
          lastName
          suffix
          companyName
          phoneE164
          address1
          address2
          city
          regionName
          regionCode
          postalCode
          countryCode
          isDefaultShipping
          isDefaultBilling
          validationStatus
          validatedAt
          latitude
          longitude
          createdAt
          updatedAt
        }
      }
      totalCount
    }
    groupMemberships(first: 100) {
      edges {
        node {
          id
          group {
            id
            code
            name
          }
          isPrimary
          source
          assignedById
          assignedAt
          expiresAt
          isActive
        }
      }
      totalCount
    }
    segmentMemberships(first: 250) {
      edges {
        node {
          id
          source
          evaluatedAt
          expiresAt
          isActive
          segment {
            id
            name
            type
            status
            color
          }
        }
      }
      totalCount
    }
    tagAssignments(first: 250) {
      edges {
        node {
          id
          assignedById
          assignedAt
          tag {
            id
            name
          }
        }
      }
      totalCount
    }
    taxIdentifiers(first: 50) {
      edges {
        node {
          id
          identifierType
          countryCode
          value
          normalizedValue
          status
          isPrimary
          verifiedAt
          validFrom
          validTo
          createdAt
          updatedAt
        }
      }
      totalCount
    }
    taxExemptions(first: 50) {
      edges {
        node {
          id
          code
          countryCode
          regionCode
          reason
          status
          certificateFileId
          certificateFile {
            id
            originalName
            mimeType
            url
          }
          validFrom
          validTo
          createdAt
          updatedAt
        }
      }
      totalCount
    }
    consents {
      id
      channel
      state
      optInLevel
      contactPoint
      source
      sourceLocationId
      sourceIp
      userAgent
      consentedAt
      withdrawnAt
      createdAt
      updatedAt
      events(first: 1, orderBy: [{ field: occurredAt, direction: desc }]) {
        edges {
          node {
            id
            previousState
            newState
            optInLevel
            contactPoint
            source
            actorType
            actorId
            occurredAt
            evidence
          }
        }
        totalCount
      }
    }
    statistics {
      ordersCount
      completedOrdersCount
      cancelledOrdersCount
      returnsCount
      firstOrderId
      firstOrderAt
      lastOrderId
      lastOrderAt
      lastCheckoutAt
      updatedAt
    }
    monetaryStatistics(first: 1, where: { currencyCode: { _eq: $currencyCode } }) {
      edges {
        node {
          id
          currencyCode
          ordersCount
          totalSpentMinor
          totalRefundedMinor
          netSpentMinor
          averageOrderValueMinor
          updatedAt
        }
      }
      totalCount
    }
  }
`;
