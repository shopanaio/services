import type { Product } from "../../../repositories/models/index.js";
import type { ScriptResult, SeoChanges } from "../../types/index.js";

/**
 * SEO input fields for product.
 */
export interface ProductSeoInput {
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
  readonly ogTitle?: string | null;
  readonly ogDescription?: string | null;
  readonly ogImageId?: string | null;
}

/**
 * Parameters for setting product SEO metadata.
 */
export interface ProductSetSeoParams {
  readonly id: string;
  readonly title?: string | null;
  readonly description?: string | null;
}

export type ProductSetSeoResult = ScriptResult<Product, SeoChanges>;
