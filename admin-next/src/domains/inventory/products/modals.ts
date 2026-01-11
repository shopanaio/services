import { createModalStackHook } from '@/layouts/modals';
import type { IModalStackPayload } from '@/layouts/modals';
import type { OutputData } from '@editorjs/editorjs';
import type { RenderedContent } from '@/ui-kit/block-editor';
import type { IProduct, IMediaFile } from "@/mocks/products/types";
import type { IPriceHistoryRecord, PriceSource } from './components/pricing';
import type { VariantColumnField } from './components/variants/config';

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
export const PRODUCT_EDIT_COMPONENTS_MODAL_TYPE = 'product-edit-components';
export const COMPONENT_VARIANT_SETTINGS_MODAL_TYPE = 'component-variant-settings';
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
  product?: IProduct;
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
  variants?: Array<{
    id: string;
    title: string;
    price: number;
    compareAtPrice?: number | null;
    priceHistory: IPriceHistoryRecord[];
  }>;
  formatPrice?: (amount: number) => string;
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
  featured: IMediaFile | null;
  gallery: IMediaFile[];
  onSave?: (media: {
    featured: IMediaFile | null;
    gallery: IMediaFile[];
  }) => void;
  onUpload?: (files: File[]) => Promise<IMediaFile[]>;
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
  ogImage?: IMediaFile | null;
  // Callback
  onSave?: (values: {
    seoTitle: string;
    seoDescription: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: IMediaFile | null;
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
  variants: Array<{
    id: string;
    title: string;
    imageUrl?: string | null;
    media?: string[] | null;
    // Inventory identification
    sku?: string | null;
    barcode?: string | null;
    // Inventory quantities (same model as inventory table)
    onHand?: number;
    unavailable?: number;
    reserved?: number;
    // Pricing
    price?: number;
    compareAtPrice?: number | null;
    costPrice?: number | null;
    // Shipping
    weight?: number | null;
    weightUnit?: string;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    dimensionUnit?: string;
    // Options
    options?: IVariantPricingOption[];
  }>;
  formatPrice?: (amount: number) => string;
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
  availableCategories?: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
  categoryHierarchy?: Record<string, string | null>;
  onSave?: (data: {
    primaryCategoryId: string | null;
    categoryIds: string[];
  }) => void;
}

export interface ITag {
  id: string;
  title: string;
  slug: string;
  color?: string;
}

export interface IEditTagsModalPayload extends IModalStackPayload {
  productId?: string;
  selectedTagIds?: string[];
  availableTags?: ITag[];
  onSave?: (data: {
    tagIds: string[];
  }) => void;
  onCreateTag?: (title: string) => Promise<ITag>;
}

export interface IEditComponentsModalPayload extends IModalStackPayload {
  productId?: string;
  groups?: import("./modals/edit-components-modal/types").IComponentGroup[];
}

export interface IBulkEditorModalPayload extends IModalStackPayload {
  productIds: string[];
}

export interface IComponentVariantSettingsModalPayload extends IModalStackPayload {
  /** The component item being edited */
  itemId: string;
  productId: string;
  productTitle: string;
  /** Current available variant IDs (null = all) */
  availableVariantIds: string[] | null;
  /** Price rule from group */
  priceType: "BASE" | "FIXED" | "MARKUP_PERCENT" | "DISCOUNT_PERCENT" | "MARKUP_FIXED" | "DISCOUNT_FIXED" | "FREE" | "INCLUDED";
  priceValue: number | null;
  /** All variants of the product */
  variants: Array<{
    id: string;
    title: string;
    sku: string;
    price: number;
    stock: number;
    options?: Array<{
      optionId: string;
      optionName: string;
      value: string;
    }>;
  }>;
  /** Product options for filtering */
  options?: Array<{
    id: string;
    name: string;
    values: string[];
  }>;
  /** Whether variants are already shown in table */
  showAsVariants?: boolean;
  /** Callback when saved */
  onSave?: (data: {
    availableVariantIds: string[] | null;
    showAsVariants: boolean;
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
    [PRODUCT_EDIT_COMPONENTS_MODAL_TYPE]: IEditComponentsModalPayload;
    [COMPONENT_VARIANT_SETTINGS_MODAL_TYPE]: IComponentVariantSettingsModalPayload;
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
 * Hook to open edit components modal (bundle configurator)
 *
 * @example
 * ```tsx
 * const { push } = useEditComponentsModal();
 * push({ productId: 'prod-123' });
 * ```
 */
export const useEditComponentsModal = createModalStackHook(PRODUCT_EDIT_COMPONENTS_MODAL_TYPE);

/**
 * Hook to open component variant settings modal
 *
 * @example
 * ```tsx
 * const { push } = useComponentVariantSettingsModal();
 * push({
 *   itemId: 'item-1',
 *   productId: 'prod-1',
 *   productTitle: 'Premium Case',
 *   availableVariantIds: ['var-1', 'var-2'],
 *   variants: [...],
 *   onSave: (data) => console.log(data)
 * });
 * ```
 */
export const useComponentVariantSettingsModal = createModalStackHook(COMPONENT_VARIANT_SETTINGS_MODAL_TYPE);

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
