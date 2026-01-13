/**
 * Workspace domain hooks.
 * Provides React hooks for all IAM service operations.
 */

// ============================================
// Authentication Hooks
// @deprecated - These hooks have moved to @/domains/auth
// Import from there instead for new code.
// ============================================
export { useSignIn } from "./use-sign-in";
export { useSignUp } from "./use-sign-up";
export { useSignOut } from "./use-sign-out";
export { useTokenRefresh } from "./use-token-refresh";

// ============================================
// User Hooks
// @deprecated useCurrentUser - moved to @/domains/auth
// ============================================
export { useCurrentUser } from "./use-current-user";
export { useUpdateProfile } from "./use-update-profile";
export { useUpdateEmail } from "./use-update-email";
export { useUpdatePassword } from "./use-update-password";

// ============================================
// Organization Hooks
// ============================================
export { useOrganization } from "./use-organization";
export { useCreateOrganization } from "./use-create-organization";
export { useUpdateOrganization } from "./use-update-organization";
export { useDeleteOrganization } from "./use-delete-organization";
export { useTransferOwnership } from "./use-transfer-ownership";

// ============================================
// Member Hooks
// ============================================
export { useInviteMember } from "./use-invite-member";
export { useRemoveMember } from "./use-remove-member";
export { useChangeMemberRole } from "./use-change-member-role";
export { useRemoveMemberAccess } from "./use-remove-member-access";

// ============================================
// Role Hooks
// ============================================
export { useCreateRole } from "./use-create-role";
export { useUpdateRole } from "./use-update-role";
export { useDeleteRole } from "./use-delete-role";

// ============================================
// Authorization Hooks
// ============================================
export { useAuthorize, useAuthorizeCheck } from "./use-authorize";
