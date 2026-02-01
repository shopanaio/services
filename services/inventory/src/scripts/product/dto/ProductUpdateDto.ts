import type { Product } from "../../../repositories/models/index.js";
import type { ScriptResult, ProductIdentityChanges } from "../../types/index.js";

/**
 * ProductUpdate handles only identity fields: handle and title.
 * For content (description/excerpt), use ProductSetContentScript.
 * For SEO, use ProductSetSeoScript.
 */
export interface ProductUpdateParams {
  readonly id: string;
  readonly handle?: string;
  readonly title?: string;
}

export type ProductUpdateResult = ScriptResult<Product, ProductIdentityChanges>;
