import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { LocaleCode } from "@/graphql/types";

// Modal type constants
export const EDIT_PROFILE_MODAL_TYPE = "profile-edit-profile";
export const CHANGE_EMAIL_MODAL_TYPE = "profile-change-email";
export const CHANGE_PASSWORD_MODAL_TYPE = "profile-change-password";
export const EDIT_AVATAR_MODAL_TYPE = "profile-edit-avatar";
export const DELETE_ACCOUNT_MODAL_TYPE = "profile-delete-account";

// Payload interfaces
export interface IEditProfileModalPayload extends IModalStackPayload {
  firstName: string;
  lastName: string;
  currentAvatar?: string | null;
  currentAvatarId?: string | null;
  locale: LocaleCode;
  onSave?: (values: {
    firstName: string;
    lastName: string;
    avatarId: string | null;
    locale: LocaleCode;
  }) => void | Promise<void>;
}

export interface IChangeEmailModalPayload extends IModalStackPayload {
  currentEmail: string;
}

export interface IChangePasswordModalPayload extends IModalStackPayload {}

export interface IEditAvatarModalPayload extends IModalStackPayload {
  currentImage?: string | null;
  onSave?: (imageUrl: string | null) => void;
}

export interface IDeleteAccountModalPayload extends IModalStackPayload {
  userName: string;
  onDelete?: () => void;
}

// Create typed hooks
export const useEditProfileModal = createModalStackHook(
  EDIT_PROFILE_MODAL_TYPE
);
export const useChangeEmailModal = createModalStackHook(
  CHANGE_EMAIL_MODAL_TYPE
);
export const useChangePasswordModal = createModalStackHook(
  CHANGE_PASSWORD_MODAL_TYPE
);
export const useEditAvatarModal = createModalStackHook(EDIT_AVATAR_MODAL_TYPE);
export const useDeleteAccountModal = createModalStackHook(
  DELETE_ACCOUNT_MODAL_TYPE
);

// Declare module augmentation for type safety
declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [EDIT_PROFILE_MODAL_TYPE]: IEditProfileModalPayload;
    [CHANGE_EMAIL_MODAL_TYPE]: IChangeEmailModalPayload;
    [CHANGE_PASSWORD_MODAL_TYPE]: IChangePasswordModalPayload;
    [EDIT_AVATAR_MODAL_TYPE]: IEditAvatarModalPayload;
    [DELETE_ACCOUNT_MODAL_TYPE]: IDeleteAccountModalPayload;
  }
}
