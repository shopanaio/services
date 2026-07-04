import type { Product, Variant } from "../../../repositories/models/index.js";
import type { UserError } from "../../../kernel/BaseScript.js";
import type { FacetReferenceChange } from "@shopana/events";
export type { RichTextInput } from "../../shared/richText.js";

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
  facetReferenceRefs?: FacetReferenceChange[];
}
