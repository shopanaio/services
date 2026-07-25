import { gql } from "@apollo/client";

export const SALES_CHANNEL_CONNECTION_FIELDS = gql`
  fragment SalesChannelConnectionFields on SalesChannelConnection {
    id
    displayName
    externalAccountId
    externalAccountLabel
    status
    effectiveActive
    configuration
    configurationVersion
    healthStatus
    updatedAt
    connectedAt
    installation {
      id
      appCode
      status
    }
    specification {
      id
      handle
      label
      appCode
      appVersion
      definition
    }
    markets {
      id
      status
      referenceStatus
      market {
        id
        code
        name
      }
    }
    publications {
      id
      name
      status
      referenceStatus
      syncMode
      lastFullSyncId
      lastFullSyncAt
      feedback {
        id
        severity
        code
        message
        active
        reportedAt
      }
    }
  }
`;
