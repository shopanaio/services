import { gql } from "@apollo/client";

export const HEADLESS_STOREFRONT_FIELDS = gql`
  fragment HeadlessStorefrontFields on HeadlessStorefrontConnection {
    id
    displayName
    status
    publicAccessToken
    createdAt
    updatedAt
    storefrontAccessPolicy {
      permissions
      revision
      updatedAt
    }
    storefrontCredentials {
      id
      kind
      status
      label
      tokenHint
      createdAt
      lastUsedAt
      revokedAt
    }
  }
`;
