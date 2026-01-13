/**
 * Workspace domain public API.
 * Exports all hooks, context, and GraphQL operations for workspace management.
 */

// ============================================
// Context
// ============================================
export {
  WorkspaceProvider,
  useWorkspace,
  useWorkspaceOptional,
} from "./context";
export type {
  WorkspaceContextValue,
  WorkspaceProviderProps,
} from "./context";

// ============================================
// Hooks
// ============================================
export {
  // Organization
  useOrganizations,
  useOrganization,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
  useTransferOwnership,
  // Store
  useStores,
  useStore,
  useCurrentStore,
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
  // User profile
  useUpdateProfile,
  useUpdateEmail,
  useUpdatePassword,
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
  UPDATE_PROFILE_MUTATION,
  UPDATE_EMAIL_MUTATION,
  UPDATE_PASSWORD_MUTATION,
} from "./graphql";
