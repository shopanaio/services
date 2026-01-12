import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { ApiRole, ApiMember } from "@/graphql/types";

// Modal type constants
export const INVITE_MEMBER_MODAL_TYPE = "workspace-invite-member";
export const EDIT_ROLE_MODAL_TYPE = "workspace-edit-role";
export const CREATE_ROLE_MODAL_TYPE = "workspace-create-role";
export const EDIT_ORGANIZATION_MODAL_TYPE = "workspace-edit-organization";
export const TRANSFER_OWNERSHIP_MODAL_TYPE = "workspace-transfer-ownership";
export const DELETE_ORGANIZATION_MODAL_TYPE = "workspace-delete-organization";
export const EDIT_PROFILE_MODAL_TYPE = "workspace-edit-profile";
export const CHANGE_EMAIL_MODAL_TYPE = "workspace-change-email";
export const CHANGE_PASSWORD_MODAL_TYPE = "workspace-change-password";
export const EDIT_AVATAR_MODAL_TYPE = "workspace-edit-avatar";
export const DELETE_ACCOUNT_MODAL_TYPE = "workspace-delete-account";
export const CREATE_STORE_MODAL_TYPE = "workspace-create-store";

// Payload interfaces
export interface IInviteMemberModalPayload extends IModalStackPayload {
  onInvite?: (email: string, roleId: string, message?: string) => void;
}

export interface IEditRoleModalPayload extends IModalStackPayload {
  role: ApiRole;
  onSave?: (role: Partial<ApiRole>) => void;
}

export interface ICreateRoleModalPayload extends IModalStackPayload {
  onSave?: (role: Omit<ApiRole, "id" | "__typename">) => void;
}

export interface IEditOrganizationModalPayload extends IModalStackPayload {
  displayName: string;
  slug: string;
  currentLogo?: string | null;
  onSave?: (values: { displayName: string; slug: string; logo: string | null }) => void;
}

export interface ITransferOwnershipModalPayload extends IModalStackPayload {
  organizationName: string;
  admins: ApiMember[];
  onTransfer?: (newOwnerId: string) => void;
}

export interface IDeleteOrganizationModalPayload extends IModalStackPayload {
  organizationName: string;
  organizationSlug: string;
  onDelete?: () => void;
}

export interface IEditProfileModalPayload extends IModalStackPayload {
  firstName: string;
  lastName: string;
  currentAvatar?: string | null;
  locale: string;
  onSave?: (values: {
    firstName: string;
    lastName: string;
    avatar: string | null;
    locale: string;
  }) => void;
}

export interface IChangeEmailModalPayload extends IModalStackPayload {
  currentEmail: string;
  onSave?: (newEmail: string) => void;
}

export interface IChangePasswordModalPayload extends IModalStackPayload {
  onSave?: (currentPassword: string, newPassword: string) => void;
}

export interface IEditAvatarModalPayload extends IModalStackPayload {
  currentImage?: string | null;
  onSave?: (imageUrl: string | null) => void;
}

export interface IDeleteAccountModalPayload extends IModalStackPayload {
  userName: string;
  onDelete?: () => void;
}

export interface ICreateStoreModalPayload extends IModalStackPayload {
  onCreate?: (values: {
    name: string;
    country: string;
    currency: string;
    locales: string[];
  }) => void;
}

// Create typed hooks
export const useInviteMemberModal = createModalStackHook(INVITE_MEMBER_MODAL_TYPE);
export const useEditRoleModal = createModalStackHook(EDIT_ROLE_MODAL_TYPE);
export const useCreateRoleModal = createModalStackHook(CREATE_ROLE_MODAL_TYPE);
export const useEditOrganizationModal = createModalStackHook(EDIT_ORGANIZATION_MODAL_TYPE);
export const useTransferOwnershipModal = createModalStackHook(TRANSFER_OWNERSHIP_MODAL_TYPE);
export const useDeleteOrganizationModal = createModalStackHook(DELETE_ORGANIZATION_MODAL_TYPE);
export const useEditProfileModal = createModalStackHook(EDIT_PROFILE_MODAL_TYPE);
export const useChangeEmailModal = createModalStackHook(CHANGE_EMAIL_MODAL_TYPE);
export const useChangePasswordModal = createModalStackHook(CHANGE_PASSWORD_MODAL_TYPE);
export const useEditAvatarModal = createModalStackHook(EDIT_AVATAR_MODAL_TYPE);
export const useDeleteAccountModal = createModalStackHook(DELETE_ACCOUNT_MODAL_TYPE);
export const useCreateStoreModal = createModalStackHook(CREATE_STORE_MODAL_TYPE);

// Declare module augmentation for type safety
declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [INVITE_MEMBER_MODAL_TYPE]: IInviteMemberModalPayload;
    [EDIT_ROLE_MODAL_TYPE]: IEditRoleModalPayload;
    [CREATE_ROLE_MODAL_TYPE]: ICreateRoleModalPayload;
    [EDIT_ORGANIZATION_MODAL_TYPE]: IEditOrganizationModalPayload;
    [TRANSFER_OWNERSHIP_MODAL_TYPE]: ITransferOwnershipModalPayload;
    [DELETE_ORGANIZATION_MODAL_TYPE]: IDeleteOrganizationModalPayload;
    [EDIT_PROFILE_MODAL_TYPE]: IEditProfileModalPayload;
    [CHANGE_EMAIL_MODAL_TYPE]: IChangeEmailModalPayload;
    [CHANGE_PASSWORD_MODAL_TYPE]: IChangePasswordModalPayload;
    [EDIT_AVATAR_MODAL_TYPE]: IEditAvatarModalPayload;
    [DELETE_ACCOUNT_MODAL_TYPE]: IDeleteAccountModalPayload;
    [CREATE_STORE_MODAL_TYPE]: ICreateStoreModalPayload;
  }
}
