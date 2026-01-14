/**
 * Profile domain public API.
 * Exports all hooks, modals, and GraphQL operations for user profile management.
 */

// ============================================
// Hooks
// ============================================
export {
  useUpdateProfile,
  useUpdateEmail,
  useUpdatePassword,
} from "./hooks";

// ============================================
// Modal Hooks
// ============================================
export {
  useEditProfileModal,
  useChangeEmailModal,
  useChangePasswordModal,
  useEditAvatarModal,
  useDeleteAccountModal,
  // Types
  EDIT_PROFILE_MODAL_TYPE,
  CHANGE_EMAIL_MODAL_TYPE,
  CHANGE_PASSWORD_MODAL_TYPE,
  EDIT_AVATAR_MODAL_TYPE,
  DELETE_ACCOUNT_MODAL_TYPE,
} from "./modals";

export type {
  IEditProfileModalPayload,
  IChangeEmailModalPayload,
  IChangePasswordModalPayload,
  IEditAvatarModalPayload,
  IDeleteAccountModalPayload,
} from "./modals";

// ============================================
// GraphQL Operations
// ============================================
export {
  // Fragments
  USER_FRAGMENT,
  USER_BASIC_FRAGMENT,
  USER_ERROR_FRAGMENT,
  // Queries
  CURRENT_USER_QUERY,
  // Mutations
  UPDATE_PROFILE_MUTATION,
  UPDATE_EMAIL_MUTATION,
  UPDATE_PASSWORD_MUTATION,
} from "./graphql";

// ============================================
// Components
// ============================================
export { ProfileInfoHeader } from "./components";
export type { IProfileInfoHeaderProps } from "./components";
