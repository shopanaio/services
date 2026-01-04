import { createModalStackHook } from '@/layouts/modals';
import type { IModalStackPayload } from '@/layouts/modals';
import type { OutputData } from '@editorjs/editorjs';
import type { RenderedContent } from '@/ui-kit/BlockEditor';
import type { IProduct, IMediaFile } from './mocks/types';
import type { IPriceHistoryRecord, IScheduledPriceRecord } from './components/pricing/PriceHistory';
import type { PriceSource } from './components/pricing/PricingBlock';

// ============================================================================
// Modal Types
// ============================================================================

export const PRODUCT_MODAL_TYPE = 'product';
export const PRODUCT_CREATE_MODAL_TYPE = 'product-create';
export const PRODUCT_EDIT_TITLE_MODAL_TYPE = 'product-edit-title';
export const PRODUCT_EDIT_DESCRIPTION_MODAL_TYPE = 'product-edit-description';
export const PRODUCT_AI_WRITER_MODAL_TYPE = 'product-ai-writer';
export const PRODUCT_PRICE_HISTORY_MODAL_TYPE = 'product-price-history';
export const PRODUCT_EDIT_VARIANT_PRICING_MODAL_TYPE = 'product-edit-variant-pricing';
export const PRODUCT_EDIT_VARIANT_INVENTORY_MODAL_TYPE = 'product-edit-variant-inventory';
export const PRODUCT_EDIT_MEDIA_MODAL_TYPE = 'product-edit-media';

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

export interface IProductPriceHistoryModalPayload extends IModalStackPayload {
  productId?: string;
  variantId?: string;
  currentPrice: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  priceSource?: PriceSource;
  priceHistory: IPriceHistoryRecord[];
  scheduledPrices?: IScheduledPriceRecord[];
  variants?: Array<{
    id: string;
    title: string;
    price: number;
    compareAtPrice?: number | null;
    priceHistory: IPriceHistoryRecord[];
    scheduledPrices?: IScheduledPriceRecord[];
  }>;
  formatPrice?: (amount: number) => string;
  onAddScheduled?: () => void;
  onEditScheduled?: (id: string) => void;
  onDeleteScheduled?: (id: string) => void;
}

export interface IVariantPricingOption {
  title: string;
  group: {
    slug: string;
    title: string;
  };
}

export interface IEditVariantPricingModalPayload extends IModalStackPayload {
  productId?: string;
  variants: Array<{
    id: string;
    title: string;
    price: number;
    compareAtPrice?: number | null;
    costPrice?: number | null;
    options?: IVariantPricingOption[];
  }>;
  formatPrice?: (amount: number) => string;
  onSave?: (variants: Array<{
    id: string;
    price: number;
    compareAtPrice: number | null;
    costPrice: number | null;
  }>) => void;
}

export interface IEditVariantInventoryModalPayload extends IModalStackPayload {
  productId?: string;
  variants: Array<{
    id: string;
    title: string;
    sku?: string | null;
    stock?: number;
    weight?: number | null;
    weightUnit?: string;
    barcode?: string | null;
    options?: IVariantPricingOption[];
  }>;
  lowStockThreshold?: number;
  onSave?: (variants: Array<{
    id: string;
    sku: string | null;
    stock: number;
    weight: number | null;
    weightUnit: string;
    barcode: string | null;
  }>) => void;
}

export interface IEditMediaModalPayload extends IModalStackPayload {
  productId?: string;
  variantId?: string;
  cover: IMediaFile | null;
  gallery: IMediaFile[];
  onSave?: (media: {
    cover: IMediaFile | null;
    gallery: IMediaFile[];
  }) => void;
  onUpload?: (files: File[]) => Promise<IMediaFile[]>;
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
    [PRODUCT_PRICE_HISTORY_MODAL_TYPE]: IProductPriceHistoryModalPayload;
    [PRODUCT_EDIT_VARIANT_PRICING_MODAL_TYPE]: IEditVariantPricingModalPayload;
    [PRODUCT_EDIT_VARIANT_INVENTORY_MODAL_TYPE]: IEditVariantInventoryModalPayload;
    [PRODUCT_EDIT_MEDIA_MODAL_TYPE]: IEditMediaModalPayload;
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

/**
 * Hook to open price history modal
 *
 * @example
 * ```tsx
 * const { push } = useProductPriceHistoryModal();
 * push({ currentPrice: 12990, priceHistory: [...] });
 * ```
 */
export const useProductPriceHistoryModal = createModalStackHook(PRODUCT_PRICE_HISTORY_MODAL_TYPE);

/**
 * Hook to open edit variant pricing modal
 *
 * @example
 * ```tsx
 * const { push } = useEditVariantPricingModal();
 * push({ variants: [...], onSave: (variants) => console.log(variants) });
 * ```
 */
export const useEditVariantPricingModal = createModalStackHook(PRODUCT_EDIT_VARIANT_PRICING_MODAL_TYPE);

/**
 * Hook to open edit variant inventory modal
 *
 * @example
 * ```tsx
 * const { push } = useEditVariantInventoryModal();
 * push({ variants: [...], onSave: (variants) => console.log(variants) });
 * ```
 */
export const useEditVariantInventoryModal = createModalStackHook(PRODUCT_EDIT_VARIANT_INVENTORY_MODAL_TYPE);

/**
 * Hook to open edit media modal
 *
 * @example
 * ```tsx
 * const { push } = useEditMediaModal();
 * push({ cover: null, gallery: [...], onSave: (media) => console.log(media) });
 * ```
 */
export const useEditMediaModal = createModalStackHook(PRODUCT_EDIT_MEDIA_MODAL_TYPE);
