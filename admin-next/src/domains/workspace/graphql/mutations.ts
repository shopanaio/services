import { gql } from "@apollo/client";
import {
  USER_FRAGMENT,
  AUTH_TOKEN_FRAGMENT,
  USER_ERROR_FRAGMENT,
  ORGANIZATION_FRAGMENT,
  ROLE_FRAGMENT,
  MEMBER_FRAGMENT,
  STORE_FRAGMENT,
} from "./fragments";

/**
 * GraphQL mutations for workspace domain.
 * Covers authentication, user, organization, role, and member mutations.
 */

// ============================================
// Authentication Mutations
// ============================================

/**
 * Sign up a new user with email and password.
 * Returns the created user and authentication tokens.
 */
export const SIGN_UP_MUTATION = gql`
  mutation SignUp($input: UserSignUpInput!) {
    authMutation {
      signUp(input: $input) {
        user {
          ...UserFields
        }
        token {
          ...AuthTokenFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_FRAGMENT}
  ${AUTH_TOKEN_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Sign in with email and password.
 * Returns the authenticated user and tokens.
 */
export const SIGN_IN_MUTATION = gql`
  mutation SignIn($input: UserSignInInput!) {
    authMutation {
      signIn(input: $input) {
        user {
          ...UserFields
        }
        token {
          ...AuthTokenFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_FRAGMENT}
  ${AUTH_TOKEN_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Sign out the current user.
 * Can optionally sign out from all sessions.
 */
export const SIGN_OUT_MUTATION = gql`
  mutation SignOut($input: UserSignOutInput!) {
    authMutation {
      signOut(input: $input) {
        success
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Refresh access token using refresh token.
 * Returns new tokens.
 */
export const TOKEN_REFRESH_MUTATION = gql`
  mutation TokenRefresh($input: UserTokenRefreshInput!) {
    authMutation {
      tokenRefresh(input: $input) {
        token {
          ...AuthTokenFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${AUTH_TOKEN_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

// ============================================
// User Mutations
// ============================================

/**
 * Update the current user's profile.
 * Can update firstName, lastName, and locale.
 */
export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UserUpdateProfileInput!) {
    userMutation {
      userUpdateProfile(input: $input) {
        user {
          ...UserFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Update the current user's email address.
 */
export const UPDATE_EMAIL_MUTATION = gql`
  mutation UpdateEmail($input: UserUpdateEmailInput!) {
    userMutation {
      userUpdateEmail(input: $input) {
        user {
          ...UserFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Update the current user's password.
 * Requires current password for verification.
 */
export const UPDATE_PASSWORD_MUTATION = gql`
  mutation UpdatePassword($input: UserUpdatePasswordInput!) {
    userMutation {
      userUpdatePassword(input: $input) {
        success
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

// ============================================
// Organization Mutations
// ============================================

/**
 * Create a new organization.
 * Current user becomes the owner automatically.
 */
export const CREATE_ORGANIZATION_MUTATION = gql`
  mutation CreateOrganization($input: OrganizationCreateInput!) {
    organizationMutation {
      organizationCreate(input: $input) {
        organization {
          ...OrganizationFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${ORGANIZATION_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Update an existing organization.
 * Requires admin or owner permission.
 */
export const UPDATE_ORGANIZATION_MUTATION = gql`
  mutation UpdateOrganization($input: OrganizationUpdateInput!) {
    organizationMutation {
      organizationUpdate(input: $input) {
        organization {
          ...OrganizationFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${ORGANIZATION_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Update an organization's logo.
 * Pass null logoId to remove the logo.
 */
export const UPDATE_ORGANIZATION_LOGO_MUTATION = gql`
  mutation UpdateOrganizationLogo($input: OrganizationUpdateLogoInput!) {
    organizationMutation {
      organizationUpdateLogo(input: $input) {
        organization {
          ...OrganizationFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${ORGANIZATION_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Delete an organization.
 * Only the owner can delete the organization.
 */
export const DELETE_ORGANIZATION_MUTATION = gql`
  mutation DeleteOrganization($id: ID!) {
    organizationMutation {
      organizationDelete(id: $id) {
        deletedOrganizationId
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Transfer organization ownership to another admin.
 * Only the current owner can transfer ownership.
 */
export const TRANSFER_OWNERSHIP_MUTATION = gql`
  mutation TransferOwnership($input: OwnershipTransferInput!) {
    organizationMutation {
      ownershipTransfer(input: $input) {
        success
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

// ============================================
// Member Mutations
// ============================================

/**
 * Invite a new member to the organization.
 * Sends an invitation email to the specified address.
 */
export const INVITE_MEMBER_MUTATION = gql`
  mutation InviteMember($input: MemberInviteInput!) {
    organizationMutation {
      memberInvite(input: $input) {
        member {
          ...MemberFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${MEMBER_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Remove a member from the organization.
 * Cannot remove the owner.
 */
export const REMOVE_MEMBER_MUTATION = gql`
  mutation RemoveMember($input: MemberRemoveInput!) {
    organizationMutation {
      memberRemove(input: $input) {
        removedMemberId
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Change a member's role in a specific domain.
 * Owner's role cannot be changed.
 */
export const CHANGE_MEMBER_ROLE_MUTATION = gql`
  mutation ChangeMemberRole($input: MemberRoleChangeInput!) {
    organizationMutation {
      memberRoleChange(input: $input) {
        member {
          ...MemberFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${MEMBER_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Remove member's access from a specific domain.
 */
export const REMOVE_MEMBER_ACCESS_MUTATION = gql`
  mutation RemoveMemberAccess($input: MemberAccessRemoveInput!) {
    organizationMutation {
      memberAccessRemove(input: $input) {
        success
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

// ============================================
// Role Mutations
// ============================================

/**
 * Create a new custom role.
 * Requires admin permission.
 */
export const CREATE_ROLE_MUTATION = gql`
  mutation CreateRole($input: RoleCreateInput!) {
    roleMutation {
      roleCreate(input: $input) {
        role {
          ...RoleFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${ROLE_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Update an existing role.
 * System roles cannot be modified.
 */
export const UPDATE_ROLE_MUTATION = gql`
  mutation UpdateRole($input: RoleUpdateInput!) {
    roleMutation {
      roleUpdate(input: $input) {
        role {
          ...RoleFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${ROLE_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Delete a custom role.
 * System roles and roles with assigned users cannot be deleted.
 */
export const DELETE_ROLE_MUTATION = gql`
  mutation DeleteRole($input: RoleDeleteInput!) {
    roleMutation {
      roleDelete(input: $input) {
        deletedRoleName
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

// ============================================
// Store Mutations
// ============================================

/**
 * Create a new store within an organization.
 * Requires store:create permission.
 */
export const CREATE_STORE_MUTATION = gql`
  mutation CreateStore($input: StoreCreateInput!) {
    storeMutation {
      storeCreate(input: $input) {
        store {
          ...StoreFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${STORE_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Update store settings.
 * Requires store:write permission.
 */
export const UPDATE_STORE_MUTATION = gql`
  mutation UpdateStore($input: StoreUpdateInput!) {
    storeMutation {
      storeUpdate(input: $input) {
        store {
          ...StoreFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${STORE_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Delete a store.
 * Requires store:admin permission.
 */
export const DELETE_STORE_MUTATION = gql`
  mutation DeleteStore($input: StoreDeleteInput!) {
    storeMutation {
      storeDelete(input: $input) {
        deletedStoreId
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;
