/**
 * Workspace domain public API.
 * Exports all hooks and GraphQL operations for workspace management.
 */

// ============================================
// Hooks
// ============================================
export {
  // Organization
  useOrganizations,
  useOrganization,
  useWorkspace,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
  useTransferOwnership,
  // Store
  useStores,
  useStore,
  useCurrentStore,
  useDefaultCurrency,
  useCreateStore,
  useUpdateStore,
  useDeleteStore,
  // Member
  useInviteMember,
  useRemoveMember,
  useChangeMemberRole,
  useRemoveMemberAccess,
  // Role
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  // Authorization
  useAuthorize,
  useAuthorizeCheck,
} from "./hooks";

// ============================================
// GraphQL Operations
// ============================================
export {
  // Fragments
  USER_FRAGMENT,
  USER_BASIC_FRAGMENT,
  ROLE_PERMISSION_FRAGMENT,
  ROLE_FRAGMENT,
  ROLE_BASIC_FRAGMENT,
  MEMBER_FRAGMENT,
  RESOURCE_DEFINITION_FRAGMENT,
  MEMBERSHIP_FRAGMENT,
  ORGANIZATION_FRAGMENT,
  ORGANIZATION_BASIC_FRAGMENT,
  STORE_FRAGMENT,
  STORE_BASIC_FRAGMENT,
  USER_ERROR_FRAGMENT,
  // Queries
  ORGANIZATIONS_QUERY,
  ORGANIZATION_QUERY,
  ORGANIZATION_BASIC_QUERY,
  STORES_QUERY,
  STORE_QUERY,
  CURRENT_STORE_QUERY,
  AUTHORIZE_QUERY,
  // Mutations
  CREATE_ORGANIZATION_MUTATION,
  UPDATE_ORGANIZATION_MUTATION,
  DELETE_ORGANIZATION_MUTATION,
  TRANSFER_OWNERSHIP_MUTATION,
  CREATE_STORE_MUTATION,
  UPDATE_STORE_MUTATION,
  DELETE_STORE_MUTATION,
  INVITE_MEMBER_MUTATION,
  REMOVE_MEMBER_MUTATION,
  CHANGE_MEMBER_ROLE_MUTATION,
  REMOVE_MEMBER_ACCESS_MUTATION,
  CREATE_ROLE_MUTATION,
  UPDATE_ROLE_MUTATION,
  DELETE_ROLE_MUTATION,
} from "./graphql";
