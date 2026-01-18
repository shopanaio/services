import type { ProductWithVariants, ProductResultBase, DescriptionInput } from "./shared.js";

/**
 * Input for creating a product option value
 */
export interface ProductCreateOptionValueInput {
  readonly name: string;
  readonly slug: string;
}

/**
 * Input for creating a product option
 */
export interface ProductCreateOptionInput {
  readonly name: string;
  readonly slug: string;
  readonly displayType?: string;
  readonly values: ProductCreateOptionValueInput[];
}

/**
 * Input for creating a variant
 * handle is built from option value slugs (e.g., "red-s")
 */
export interface ProductCreateVariantInput {
  readonly handle: string;
}

/**
 * Parameters for creating a product with all its data in one request
 */
export interface ProductCreateParams {
  readonly title: string;
  readonly handle: string;
  readonly description?: DescriptionInput;

  /** File IDs for product media (already uploaded) */
  readonly mediaFileIds?: string[];

  /** Product options (e.g., Color, Size) */
  readonly options?: ProductCreateOptionInput[];

  /** Variants to create (only enabled ones from UI) */
  readonly variants?: ProductCreateVariantInput[];
}

export interface VariantMediaEntry {
  variantId: string;
  fileIds: string[];
}

export interface ProductCreateResult extends ProductResultBase {
  product?: ProductWithVariants;
  /** Map of variant IDs to file IDs for back-ref syncing */
  variantMediaMap?: VariantMediaEntry[];
}
