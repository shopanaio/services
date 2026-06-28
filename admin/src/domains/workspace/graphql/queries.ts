import { gql } from "@apollo/client";
import {
  USER_FRAGMENT,
  ORGANIZATION_FRAGMENT,
  ORGANIZATION_BASIC_FRAGMENT,
  CURRENT_STORE_FRAGMENT,
  STORE_FRAGMENT,
  STORE_BASIC_FRAGMENT,
} from "./fragments";

/**
 * GraphQL queries for workspace domain.
 * Covers user, organization, and authorization queries.
 */

// ============================================
// User Queries
// ============================================

/**
 * Get the current authenticated user.
 * Returns null if not authenticated.
 */
export const CURRENT_USER_QUERY = gql`
  query CurrentUser {
    userQuery {
      current {
        ...UserFields
      }
    }
  }
  ${USER_FRAGMENT}
`;

/**
 * Check if user is authorized for a specific action.
 * Used for permission checks before performing operations.
 */
export const AUTHORIZE_QUERY = gql`
  query Authorize($input: AuthorizeInput!) {
    userQuery {
      authorize(input: $input) {
        allowed
        deniedReason
      }
    }
  }
`;

// ============================================
// Organization Queries
// ============================================

/**
 * Get organization by name with full membership details.
 * Includes all members, roles, and available resources.
 */
export const ORGANIZATION_QUERY = gql`
  query Organization($name: String!) {
    organizationQuery {
      organization(name: $name) {
        ...OrganizationFields
      }
    }
  }
  ${ORGANIZATION_FRAGMENT}
`;

/**
 * Get organization with minimal info (for lists, selections).
 */
export const ORGANIZATION_BASIC_QUERY = gql`
  query OrganizationBasic($name: String!) {
    organizationQuery {
      organization(name: $name) {
        id
        name
        displayName
        createdAt
      }
    }
  }
`;

/**
 * List all organizations the current user has access to.
 */
export const ORGANIZATIONS_QUERY = gql`
  query Organizations {
    organizationQuery {
      organizations {
        edges {
          node {
            ...OrganizationBasicFields
          }
        }
      }
    }
  }
  ${ORGANIZATION_BASIC_FRAGMENT}
`;

// ============================================
// Store Queries
// ============================================

/**
 * List all stores in an organization that the user has access to.
 */
export const STORES_QUERY = gql`
  query Stores($organizationId: ID!) {
    storeQuery {
      stores(organizationId: $organizationId) {
        ...StoreBasicFields
      }
    }
  }
  ${STORE_BASIC_FRAGMENT}
`;

/**
 * Get the current store from context (set via headers).
 * Returns full store details including membership.
 */
export const CURRENT_STORE_QUERY = gql`
  query CurrentStore {
    storeQuery {
      currentStore {
        ...CurrentStoreFields
      }
    }
  }
  ${CURRENT_STORE_FRAGMENT}
`;

/**
 * Get a single store by ID with full details.
 */
export const STORE_QUERY = gql`
  query Store($organizationId: ID!) {
    storeQuery {
      stores(organizationId: $organizationId) {
        ...StoreFields
      }
    }
  }
  ${STORE_FRAGMENT}
`;
