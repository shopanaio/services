import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { ApiCategory } from "@/graphql/types";
import type {
  CategoryContentFormValues,
  CategoryIdentityFormValues,
  CategoryMediaFormValues,
  CategorySeoFormValues,
  CategorySortFormValues,
} from "./mappers";

// ============================================================================
// Modal Types
// ============================================================================

export const CATEGORY_MODAL_TYPE = 'category';
export const CATEGORY_CREATE_MODAL_TYPE = 'category-create';
export const CATEGORY_EDIT_IDENTITY_MODAL_TYPE = 'category-edit-identity';
export const CATEGORY_EDIT_CONTENT_MODAL_TYPE = 'category-edit-content';
export const CATEGORY_EDIT_SEO_MODAL_TYPE = 'category-edit-seo';
export const CATEGORY_EDIT_MEDIA_MODAL_TYPE = 'category-edit-media';
export const CATEGORY_EDIT_SORT_MODAL_TYPE = 'category-edit-sort';

// ============================================================================
// Payload Interfaces
// ============================================================================

export interface ICategoryModalPayload extends IModalStackPayload {
  entityId?: string;
}

export interface ICreateCategoryModalPayload extends IModalStackPayload {
  parentId?: string | null;
  onCreated?: (category: ApiCategory) => void;
}

interface ICategoryEditModalPayload extends IModalStackPayload {
  category: ApiCategory;
  onSaved?: () => Promise<unknown> | unknown;
}

export interface ICategoryEditIdentityModalPayload
  extends ICategoryEditModalPayload {
  onSave?: (
    values: CategoryIdentityFormValues,
  ) => boolean | void | Promise<boolean | void>;
}

export interface ICategoryEditContentModalPayload
  extends ICategoryEditModalPayload {
  onSave?: (
    values: CategoryContentFormValues,
  ) => boolean | void | Promise<boolean | void>;
}

export interface ICategoryEditSeoModalPayload
  extends ICategoryEditModalPayload {
  onSave?: (
    values: CategorySeoFormValues,
  ) => boolean | void | Promise<boolean | void>;
}

export interface ICategoryEditMediaModalPayload
  extends ICategoryEditModalPayload {
  onSave?: (
    values: CategoryMediaFormValues,
  ) => boolean | void | Promise<boolean | void>;
}

export interface ICategoryEditSortModalPayload
  extends ICategoryEditModalPayload {
  onSave?: (
    values: CategorySortFormValues,
  ) => boolean | void | Promise<boolean | void>;
}

// ============================================================================
// Module Augmentation for Type Safety
// ============================================================================

declare module '@/layouts/modals' {
  interface ModalStackPayloads {
    [CATEGORY_MODAL_TYPE]: ICategoryModalPayload;
    [CATEGORY_CREATE_MODAL_TYPE]: ICreateCategoryModalPayload;
    [CATEGORY_EDIT_IDENTITY_MODAL_TYPE]: ICategoryEditIdentityModalPayload;
    [CATEGORY_EDIT_CONTENT_MODAL_TYPE]: ICategoryEditContentModalPayload;
    [CATEGORY_EDIT_SEO_MODAL_TYPE]: ICategoryEditSeoModalPayload;
    [CATEGORY_EDIT_MEDIA_MODAL_TYPE]: ICategoryEditMediaModalPayload;
    [CATEGORY_EDIT_SORT_MODAL_TYPE]: ICategoryEditSortModalPayload;
  }
}

// ============================================================================
// Typed Hooks
// ============================================================================

export const useCategoryModal = createModalStackHook(CATEGORY_MODAL_TYPE);
export const useCreateCategoryModal = createModalStackHook(
  CATEGORY_CREATE_MODAL_TYPE,
);
export const useCategoryEditIdentityModal = createModalStackHook(
  CATEGORY_EDIT_IDENTITY_MODAL_TYPE,
);
export const useCategoryEditContentModal = createModalStackHook(
  CATEGORY_EDIT_CONTENT_MODAL_TYPE,
);
export const useCategoryEditSeoModal = createModalStackHook(
  CATEGORY_EDIT_SEO_MODAL_TYPE,
);
export const useCategoryEditMediaModal = createModalStackHook(
  CATEGORY_EDIT_MEDIA_MODAL_TYPE,
);
export const useCategoryEditSortModal = createModalStackHook(
  CATEGORY_EDIT_SORT_MODAL_TYPE,
);
