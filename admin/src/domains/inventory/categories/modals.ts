import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { ApiCategory } from "@/graphql/types";

// ============================================================================
// Modal Types
// ============================================================================

export const CATEGORY_MODAL_TYPE = 'category';
export const CATEGORY_CREATE_MODAL_TYPE = 'category-create';

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

// ============================================================================
// Module Augmentation for Type Safety
// ============================================================================

declare module '@/layouts/modals' {
  interface ModalStackPayloads {
    [CATEGORY_MODAL_TYPE]: ICategoryModalPayload;
    [CATEGORY_CREATE_MODAL_TYPE]: ICreateCategoryModalPayload;
  }
}

// ============================================================================
// Typed Hooks
// ============================================================================

export const useCategoryModal = createModalStackHook(CATEGORY_MODAL_TYPE);
export const useCreateCategoryModal = createModalStackHook(
  CATEGORY_CREATE_MODAL_TYPE,
);
