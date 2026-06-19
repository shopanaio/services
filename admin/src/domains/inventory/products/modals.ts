import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { OutputData } from '@editorjs/editorjs';
import type { RenderedContent } from '@/ui-kit/editor/renderers';
import type {
  ApiCategory,
  ApiFile,
  ApiProduct,
  ApiProductOption,
  ApiTag,
  ApiVariant,
} from "@/graphql/types";
import type { IAttributeRow } from "./modals/edit-attributes-modal/types";
import type { ApiVariantPrice } from './components/pricing/types';
import type { VariantColumnField } from './components/variants/config/types';

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
export const PRODUCT_EDIT_OPTIONS_MODAL_TYPE = 'product-edit-options';
export const PRODUCT_EDIT_ATTRIBUTES_MODAL_TYPE = 'product-edit-attributes';
export const PRODUCT_EDIT_SEO_MODAL_TYPE = 'product-edit-seo';
export const PRODUCT_EDIT_VARIANT_SHIPPING_MODAL_TYPE = 'product-edit-variant-shipping';
export const PRODUCT_EDIT_VARIANTS_MODAL_TYPE = 'product-edit-variants';
export const PRODUCT_EDIT_CATEGORIES_MODAL_TYPE = 'product-edit-categories';
export const PRODUCT_EDIT_TAGS_MODAL_TYPE = 'product-edit-tags';
export const BULK_EDITOR_MODAL_TYPE = 'bulk-editor';

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
  product?: ApiProduct;
  onSave?: (values: { description: RenderedContent; excerpt: RenderedContent }) => void;
}

export type AIGenerateTarget = 'description' | 'excerpt' | 'both';
export type AITone = 'professional' | 'casual' | 'luxury' | 'friendly';

export interface IProductAIWriterModalPayload extends IModalStackPayload {
  product: ApiProduct;
  supplementalAttributes?: IAttributeRow[];
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
  priceHistory: ApiVariantPrice[];
  variants?: Array<{
    id: string;
    title: string;
    price: number;
    compareAtPrice?: number | null;
    priceHistory: ApiVariantPrice[];
  }>;
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
  featured: ApiFile | null;
  gallery: ApiFile[];
  onSave?: (media: {
    featured: ApiFile | null;
    gallery: ApiFile[];
  }) => void;
}

export interface IEditOptionsModalPayload extends IModalStackPayload {
  productId?: string;
}

export interface IEditAttributesModalPayload extends IModalStackPayload {
  productId?: string;
}

export interface IEditSeoModalPayload extends IModalStackPayload {
  productId?: string;
  productTitle?: string;
  productSlug?: string;
  baseUrl?: string;
  // Basic SEO
  seoTitle?: string | null;
  seoDescription?: string | null;
  // Open Graph
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: ApiFile | null;
  // Callback
  onSave?: (values: {
    seoTitle: string;
    seoDescription: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: ApiFile | null;
  }) => void;
}

export interface IEditVariantShippingModalPayload extends IModalStackPayload {
  productId?: string;
  variants: Array<{
    id: string;
    title: string;
    imageUrl?: string | null;
    weight?: number | null;
    weightUnit?: string;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    dimensionUnit?: string;
    options?: IVariantPricingOption[];
  }>;
  onSave?: (variants: Array<{
    id: string;
    weight: number | null;
    weightUnit: string;
    length: number | null;
    width: number | null;
    height: number | null;
    dimensionUnit: string;
  }>) => void;
}

export type VariantTabKey = 'inventory' | 'pricing' | 'shipping' | 'media' | 'options';

// Re-export for convenience
export type { VariantColumnField };

export interface IEditVariantsModalPayload extends IModalStackPayload {
  productId?: string;
  initialTab?: VariantTabKey;
  variants: ApiVariant[];
  productOptions: ApiProductOption[];
  /**
   * When provided, only these columns will be shown.
   * If undefined, all columns are available with user settings.
   * Example: ['price', 'compareAtPrice', 'costPrice'] for pricing-only modal.
   */
  availableColumns?: VariantColumnField[];
  /**
   * Whether to show the column settings button. Defaults to true.
   * Set to false when using restricted columns without user customization.
   */
  showColumnSettings?: boolean;
  onSave?: (variants: Array<{
    id: string;
    sku: string | null;
    barcode: string | null;
    // Inventory quantities
    onHand: number;
    unavailable: number;
    reserved: number;
    available: number;
    price: number;
    compareAtPrice: number | null;
    costPrice: number | null;
    weight: number | null;
    weightUnit: string;
    length: number | null;
    width: number | null;
    height: number | null;
    dimensionUnit: string;
  }>) => void;
}

export interface IEditCategoriesModalPayload extends IModalStackPayload {
  productId?: string;
  primaryCategoryId?: string | null;
  categoryIds?: string[];
  availableCategories?: ApiCategory[];
  categoryHierarchy?: Record<string, string | null>;
  onSave?: (data: {
    primaryCategoryId: string | null;
    categoryIds: string[];
  }) => void;
}

export interface IEditTagsModalPayload extends IModalStackPayload {
  productId?: string;
  selectedTagIds?: string[];
  availableTags?: ApiTag[];
  onSave?: (data: {
    tagIds: string[];
  }) => void;
  onCreateTag?: (name: string) => Promise<ApiTag>;
}


export interface IBulkEditorModalPayload extends IModalStackPayload {
  productIds: string[];
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
    [PRODUCT_EDIT_OPTIONS_MODAL_TYPE]: IEditOptionsModalPayload;
    [PRODUCT_EDIT_ATTRIBUTES_MODAL_TYPE]: IEditAttributesModalPayload;
    [PRODUCT_EDIT_SEO_MODAL_TYPE]: IEditSeoModalPayload;
    [PRODUCT_EDIT_VARIANT_SHIPPING_MODAL_TYPE]: IEditVariantShippingModalPayload;
    [PRODUCT_EDIT_VARIANTS_MODAL_TYPE]: IEditVariantsModalPayload;
    [PRODUCT_EDIT_CATEGORIES_MODAL_TYPE]: IEditCategoriesModalPayload;
    [PRODUCT_EDIT_TAGS_MODAL_TYPE]: IEditTagsModalPayload;
    [BULK_EDITOR_MODAL_TYPE]: IBulkEditorModalPayload;
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
 * push({ featured: null, gallery: [...], onSave: (media) => console.log(media) });
 * ```
 */
export const useEditMediaModal = createModalStackHook(PRODUCT_EDIT_MEDIA_MODAL_TYPE);

/**
 * Hook to open edit options modal
 *
 * @example
 * ```tsx
 * const { push } = useEditOptionsModal();
 * push({ productId: 'prod-123' });
 * ```
 */
export const useEditOptionsModal = createModalStackHook(PRODUCT_EDIT_OPTIONS_MODAL_TYPE);

/**
 * Hook to open edit attributes modal
 *
 * @example
 * ```tsx
 * const { push } = useEditAttributesModal();
 * push({ productId: 'prod-123' });
 * ```
 */
export const useEditAttributesModal = createModalStackHook(PRODUCT_EDIT_ATTRIBUTES_MODAL_TYPE);

/**
 * Hook to open edit SEO modal
 *
 * @example
 * ```tsx
 * const { push } = useEditSeoModal();
 * push({
 *   productId: 'prod-123',
 *   productTitle: 'Product Name',
 *   seoTitle: 'Custom SEO Title',
 *   seoDescription: 'Custom meta description',
 *   slug: 'product-name',
 *   onSave: (values) => console.log(values)
 * });
 * ```
 */
export const useEditSeoModal = createModalStackHook(PRODUCT_EDIT_SEO_MODAL_TYPE);

/**
 * Hook to open edit variant shipping modal
 *
 * @example
 * ```tsx
 * const { push } = useEditVariantShippingModal();
 * push({ variants: [...], onSave: (variants) => console.log(variants) });
 * ```
 */
export const useEditVariantShippingModal = createModalStackHook(PRODUCT_EDIT_VARIANT_SHIPPING_MODAL_TYPE);

/**
 * Hook to open unified edit variants modal with tabs
 *
 * @example
 * ```tsx
 * const { push } = useEditVariantsModal();
 * push({ variants: [...], initialTab: 'pricing', onSave: (variants) => console.log(variants) });
 * ```
 */
export const useEditVariantsModal = createModalStackHook(PRODUCT_EDIT_VARIANTS_MODAL_TYPE);

/**
 * Hook to open edit categories modal
 *
 * @example
 * ```tsx
 * const { push } = useEditCategoriesModal();
 * push({
 *   productId: 'prod-123',
 *   primaryCategoryId: 'cat-1',
 *   categoryIds: ['cat-1', 'cat-2'],
 *   onSave: (data) => console.log(data)
 * });
 * ```
 */
export const useEditCategoriesModal = createModalStackHook(PRODUCT_EDIT_CATEGORIES_MODAL_TYPE);

/**
 * Hook to open edit tags modal
 *
 * @example
 * ```tsx
 * const { push } = useEditTagsModal();
 * push({
 *   productId: 'prod-123',
 *   selectedTagIds: ['tag-1', 'tag-2'],
 *   onSave: (data) => console.log(data)
 * });
 * ```
 */
export const useEditTagsModal = createModalStackHook(PRODUCT_EDIT_TAGS_MODAL_TYPE);


/**
 * Hook to open bulk editor modal
 *
 * @example
 * ```tsx
 * const { push } = useBulkEditorModal();
 * push({ productIds: ['prod-1', 'prod-2'] });
 * ```
 */
export const useBulkEditorModal = createModalStackHook(BULK_EDITOR_MODAL_TYPE);
