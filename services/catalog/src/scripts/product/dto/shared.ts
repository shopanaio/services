import type { Product, Variant } from "../../../repositories/models/index.js";
import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * Input for product description (text, HTML, JSON)
 */
export interface DescriptionInput {
  readonly text: string;
  readonly html: string;
  readonly json: Record<string, unknown>;
}

/**
 * Product with embedded variants
 */
export interface ProductWithVariants extends Product {
  _variants?: Variant[];
}

/**
 * Base result interface for product scripts
 */
export interface ProductResultBase {
  userErrors: UserError[];
}
