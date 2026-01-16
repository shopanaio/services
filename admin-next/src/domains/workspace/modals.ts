import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type {
  ApiRole,
  ApiMember,
  ApiRolePermissionInput,
  ApiResourceDefinition,
} from "@/graphql/types";
import type { RoleModalMode } from "./modals/role-modal/types";

// Modal type constants
export const INVITE_MEMBER_MODAL_TYPE = "workspace-invite-member";
export const ROLE_MODAL_TYPE = "workspace-role";
export const EDIT_ORGANIZATION_MODAL_TYPE = "workspace-edit-organization";
export const TRANSFER_OWNERSHIP_MODAL_TYPE = "workspace-transfer-ownership";
export const DELETE_ORGANIZATION_MODAL_TYPE = "workspace-delete-organization";
export const CREATE_STORE_MODAL_TYPE = "workspace-create-store";
export const CREATE_ORGANIZATION_MODAL_TYPE = "workspace-create-organization";

// Payload interfaces
export interface IInviteMemberModalPayload extends IModalStackPayload {
  organizationId: string;
  roles: ApiRole[];
}

/**
 * Unified role modal payload - supports create, edit, and view modes
 */
export interface IRoleModalPayload extends IModalStackPayload {
  /** Modal mode: create, edit, or view */
  mode: RoleModalMode;
  /** Organization ID for the role */
  organizationId: string;
  /** Domain scope (org or store:{uuid}) */
  domain?: string;
  /** Role data (required for edit/view modes) */
  role?: ApiRole;
  /** Available resources from API */
  availableResources: ApiResourceDefinition[];
  /** Callback for create mode */
  onCreate?: (input: {
    name: string;
    displayName: string;
    description?: string;
    permissions: ApiRolePermissionInput[];
    organizationId: string;
    domain: string;
  }) => Promise<void>;
  /** Callback for edit mode */
  onUpdate?: (input: {
    displayName?: string;
    description?: string;
    permissions?: ApiRolePermissionInput[];
  }) => Promise<void>;
}

export interface IEditOrganizationModalPayload extends IModalStackPayload {
  displayName: string;
  slug: string;
  currentLogo?: string | null;
  currentLogoId?: string | null;
  onSave?: (values: {
    displayName: string;
    slug: string;
    logoId: string | null;
  }) => void;
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

export interface ICreateStoreModalPayload extends IModalStackPayload {
  onCreate?: (values: {
    name: string;
    country: string;
    currency: string;
    locales: string[];
  }) => void;
}

export interface ICreateOrganizationModalPayload extends IModalStackPayload {
  onCreate?: (values: {
    name: string;
    displayName: string;
  }) => Promise<void> | void;
}

// Create typed hooks
export const useInviteMemberModal = createModalStackHook(
  INVITE_MEMBER_MODAL_TYPE
);
export const useRoleModal = createModalStackHook(ROLE_MODAL_TYPE);
export const useEditOrganizationModal = createModalStackHook(
  EDIT_ORGANIZATION_MODAL_TYPE
);
export const useTransferOwnershipModal = createModalStackHook(
  TRANSFER_OWNERSHIP_MODAL_TYPE
);
export const useDeleteOrganizationModal = createModalStackHook(
  DELETE_ORGANIZATION_MODAL_TYPE
);
export const useCreateStoreModal = createModalStackHook(
  CREATE_STORE_MODAL_TYPE
);
export const useCreateOrganizationModal = createModalStackHook(
  CREATE_ORGANIZATION_MODAL_TYPE
);

// Declare module augmentation for type safety
declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [INVITE_MEMBER_MODAL_TYPE]: IInviteMemberModalPayload;
    [ROLE_MODAL_TYPE]: IRoleModalPayload;
    [EDIT_ORGANIZATION_MODAL_TYPE]: IEditOrganizationModalPayload;
    [TRANSFER_OWNERSHIP_MODAL_TYPE]: ITransferOwnershipModalPayload;
    [DELETE_ORGANIZATION_MODAL_TYPE]: IDeleteOrganizationModalPayload;
    [CREATE_STORE_MODAL_TYPE]: ICreateStoreModalPayload;
    [CREATE_ORGANIZATION_MODAL_TYPE]: ICreateOrganizationModalPayload;
  }
}
