import { createModalStackHook } from '@/layouts/modals';
import type { IModalStackPayload } from '@/layouts/modals';
import type { OutputData } from '@editorjs/editorjs';
import type { RenderedContent } from '@/ui-kit/BlockEditor';
import type { IProduct } from './mocks/types';

// ============================================================================
// Modal Types
// ============================================================================

export const PRODUCT_MODAL_TYPE = 'product';
export const PRODUCT_CREATE_MODAL_TYPE = 'product-create';
export const PRODUCT_EDIT_TITLE_MODAL_TYPE = 'product-edit-title';
export const PRODUCT_EDIT_DESCRIPTION_MODAL_TYPE = 'product-edit-description';
export const PRODUCT_AI_WRITER_MODAL_TYPE = 'product-ai-writer';

// ============================================================================
// Payload Interfaces
// ============================================================================

export interface IProductModalPayload extends IModalStackPayload {
  entityId: string;
  mode?: 'view' | 'edit';
}

export interface IProductCreateModalPayload extends IModalStackPayload {
  categoryId?: string;
  duplicateFromId?: string;
}

export interface IProductEditTitleModalPayload extends IModalStackPayload {
  title: string;
  handle: string;
  onSave?: (values: { title: string; handle: string }) => void;
}

export interface IProductEditDescriptionModalPayload extends IModalStackPayload {
  description: OutputData | null;
  excerpt: OutputData | null;
  onSave?: (values: { description: RenderedContent; excerpt: RenderedContent }) => void;
}

export type AIGenerateTarget = 'description' | 'excerpt' | 'both';
export type AITone = 'professional' | 'casual' | 'luxury' | 'friendly';

export interface IProductAIWriterModalPayload extends IModalStackPayload {
  product: IProduct;
  onApply?: (values: {
    description?: RenderedContent;
    excerpt?: RenderedContent;
  }) => void;
}

// ============================================================================
// Module Augmentation for Type Safety
// ============================================================================

declare module '@/layouts/modals' {
  interface ModalStackPayloads {
    [PRODUCT_MODAL_TYPE]: IProductModalPayload;
    [PRODUCT_CREATE_MODAL_TYPE]: IProductCreateModalPayload;
    [PRODUCT_EDIT_TITLE_MODAL_TYPE]: IProductEditTitleModalPayload;
    [PRODUCT_EDIT_DESCRIPTION_MODAL_TYPE]: IProductEditDescriptionModalPayload;
    [PRODUCT_AI_WRITER_MODAL_TYPE]: IProductAIWriterModalPayload;
  }
}

// ============================================================================
// Typed Hooks
// ============================================================================

/**
 * Hook to open product modal
 *
 * @example
 * ```tsx
 * const { push } = useProductModal();
 * push({ entityId: 'prod-123', mode: 'edit' });
 * ```
 */
export const useProductModal = createModalStackHook(PRODUCT_MODAL_TYPE);

/**
 * Hook to open product create modal
 *
 * @example
 * ```tsx
 * const { push } = useProductCreateModal();
 * push({ categoryId: 'cat-123' });
 * ```
 */
export const useProductCreateModal = createModalStackHook(PRODUCT_CREATE_MODAL_TYPE);

/**
 * Hook to open product edit title modal
 *
 * @example
 * ```tsx
 * const { push } = useProductEditTitleModal();
 * push({ title: 'Product Name', handle: 'product-name', onSave: (values) => console.log(values) });
 * ```
 */
export const useProductEditTitleModal = createModalStackHook(PRODUCT_EDIT_TITLE_MODAL_TYPE);

/**
 * Hook to open product edit description modal
 *
 * @example
 * ```tsx
 * const { push } = useProductEditDescriptionModal();
 * push({ description: 'Product desc', excerpt: 'Short excerpt', onSave: (values) => console.log(values) });
 * ```
 */
export const useProductEditDescriptionModal = createModalStackHook(PRODUCT_EDIT_DESCRIPTION_MODAL_TYPE);

/**
 * Hook to open AI writer modal for generating product content
 *
 * @example
 * ```tsx
 * const { push } = useProductAIWriterModal();
 * push({ product, onApply: (values) => console.log(values) });
 * ```
 */
export const useProductAIWriterModal = createModalStackHook(PRODUCT_AI_WRITER_MODAL_TYPE);
