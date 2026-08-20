import { gql } from "@apollo/client";
import type { TypedDocumentNodeLike } from "@shopana/admin-app-sdk";
import { HEADLESS_STOREFRONT_FIELDS } from "./fragments";
import type {
  HeadlessStorefrontQueryData,
  HeadlessStorefrontQueryVariables,
  HeadlessStorefrontsQueryData,
  HeadlessStorefrontsQueryVariables,
} from "./operation-types";

export const HEADLESS_STOREFRONTS_QUERY = gql`
  query HeadlessStorefronts {
    headlessAppQuery {
      headlessStorefrontPermissionCatalog {
        handle
        resource
        action
        label
        description
        risk
      }
      headlessStorefrontDefaultPermissions
      headlessStorefrontConnections {
        ...HeadlessStorefrontFields
      }
    }
  }
  ${HEADLESS_STOREFRONT_FIELDS}
` as TypedDocumentNodeLike<HeadlessStorefrontsQueryData, HeadlessStorefrontsQueryVariables>;

export const HEADLESS_STOREFRONT_QUERY = gql`
  query HeadlessStorefront($id: ID!) {
    headlessAppQuery {
      headlessStorefrontConnection(id: $id) {
        ...HeadlessStorefrontFields
      }
      headlessStorefrontPermissionCatalog {
        handle
        resource
        action
        label
        description
        risk
      }
    }
  }
  ${HEADLESS_STOREFRONT_FIELDS}
` as TypedDocumentNodeLike<HeadlessStorefrontQueryData, HeadlessStorefrontQueryVariables>;
