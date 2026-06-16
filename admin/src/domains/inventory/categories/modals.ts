import { createModalStackHook } from '@/layouts/modals';
import type { IModalStackPayload } from '@/layouts/modals';

// ============================================================================
// Modal Types
// ============================================================================

export const CATEGORY_MODAL_TYPE = 'category';

// ============================================================================
// Payload Interfaces
// ============================================================================

export interface ICategoryModalPayload extends IModalStackPayload {
  entityId?: string;
}

// ============================================================================
// Module Augmentation for Type Safety
// ============================================================================

declare module '@/layouts/modals' {
  interface ModalStackPayloads {
    [CATEGORY_MODAL_TYPE]: ICategoryModalPayload;
  }
}

// ============================================================================
// Typed Hooks
// ============================================================================

export const useCategoryModal = createModalStackHook(CATEGORY_MODAL_TYPE);
