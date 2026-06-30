import { gql } from "@apollo/client";

/**
 * Core GraphQL fragments for workspace domain entities.
 * These fragments define the fields we typically need for each entity.
 */

// File reference fragment - minimal fields for avatar/logo
export const FILE_REF_FRAGMENT = gql`
  fragment FileRefFields on File {
    id
    url
  }
`;

// User fragment - basic user information
export const USER_FRAGMENT = gql`
  fragment UserFields on User {
    id
    email
    firstName
    lastName
    avatar {
      ...FileRefFields
    }
    locale
    isAdmin
    emailVerified
    isDeleted
    isForbidden
    createdAt
    updatedAt
  }
  ${FILE_REF_FRAGMENT}
`;

// User fragment - minimal info for lists and references
export const USER_BASIC_FRAGMENT = gql`
  fragment UserBasicFields on User {
    id
    email
    firstName
    lastName
    avatar {
      ...FileRefFields
    }
  }
  ${FILE_REF_FRAGMENT}
`;

// Role permission fragment
export const ROLE_PERMISSION_FRAGMENT = gql`
  fragment RolePermissionFields on RolePermission {
    resource
    actions
  }
`;

// Role fragment - full role information with permissions
export const ROLE_FRAGMENT = gql`
  fragment RoleFields on Role {
    id
    name
    displayName
    description
    domain
    isSystem
    permissions {
      ...RolePermissionFields
    }
    createdAt
    updatedAt
  }
  ${ROLE_PERMISSION_FRAGMENT}
`;

// Role fragment - minimal info for lists
export const ROLE_BASIC_FRAGMENT = gql`
  fragment RoleBasicFields on Role {
    id
    name
    displayName
    domain
    isSystem
  }
`;

// Member fragment - organization member with user and role info
export const MEMBER_FRAGMENT = gql`
  fragment MemberFields on Member {
    id
    role
    isOwner
    grantedAt
    user {
      ...UserBasicFields
    }
    grantedBy {
      ...UserBasicFields
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// Resource definition fragment - for role editor
export const RESOURCE_DEFINITION_FRAGMENT = gql`
  fragment ResourceDefinitionFields on ResourceDefinition {
    name
    displayName
    description
    actions
  }
`;

// Membership fragment - members and roles for a domain
export const MEMBERSHIP_FRAGMENT = gql`
  fragment MembershipFields on Membership {
    domain
    organizationId
    members {
      ...MemberFields
    }
    roles {
      ...RoleFields
    }
    availableResources {
      ...ResourceDefinitionFields
    }
  }
  ${MEMBER_FRAGMENT}
  ${ROLE_FRAGMENT}
  ${RESOURCE_DEFINITION_FRAGMENT}
`;

// Organization fragment - full organization with membership
export const ORGANIZATION_FRAGMENT = gql`
  fragment OrganizationFields on Organization {
    id
    name
    displayName
    logo {
      ...FileRefFields
    }
    createdAt
    updatedAt
    membership {
      ...MembershipFields
    }
  }
  ${MEMBERSHIP_FRAGMENT}
  ${FILE_REF_FRAGMENT}
`;

// Organization fragment - minimal info for lists
export const ORGANIZATION_BASIC_FRAGMENT = gql`
  fragment OrganizationBasicFields on Organization {
    id
    name
    displayName
    logo {
      ...FileRefFields
    }
    createdAt
  }
  ${FILE_REF_FRAGMENT}
`;

// Auth token fragment
export const AUTH_TOKEN_FRAGMENT = gql`
  fragment AuthTokenFields on AuthTokenPayload {
    accessToken
    refreshToken
    expiresIn
  }
`;

// Generic user error fragment
export const USER_ERROR_FRAGMENT = gql`
  fragment UserErrorFields on GenericUserError {
    code
    field
    message
  }
`;

// ============================================
// Store Fragments
// ============================================

// Store fragment - minimal info for lists and selectors
export const STORE_BASIC_FRAGMENT = gql`
  fragment StoreBasicFields on Store {
    id
    name
    displayName
    status
    currencies
    defaultCurrency
    createdAt
  }
`;

// Store fragment - full store with all settings
export const STORE_FRAGMENT = gql`
  fragment StoreFields on Store {
    id
    name
    displayName
    status
    timezone
    email
    locales
    currencies
    baseCurrency
    defaultLocale
    defaultCurrency
    defaultWeightUnit
    defaultDimensionUnit
    createdAt
    updatedAt
    organization {
      id
      name
      displayName
    }
    membership {
      ...MembershipFields
    }
  }
  ${MEMBERSHIP_FRAGMENT}
`;

// Store fragment for current store context without organization fields
export const CURRENT_STORE_FRAGMENT = gql`
  fragment CurrentStoreFields on Store {
    id
    name
    displayName
    status
    timezone
    email
    locales
    currencies
    baseCurrency
    defaultLocale
    defaultCurrency
    defaultWeightUnit
    defaultDimensionUnit
    createdAt
    updatedAt
    membership {
      ...MembershipFields
    }
  }
  ${MEMBERSHIP_FRAGMENT}
`;
