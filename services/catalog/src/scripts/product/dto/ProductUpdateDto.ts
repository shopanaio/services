import type { Product } from "../../../repositories/models/index.js";
import type { ScriptResult, ProductIdentityChanges } from "../../types/index.js";

/**
 * ProductUpdate handles only identity fields: handle, title, and vendor.
 * For content (description/excerpt), use ProductSetContentScript.
 * For SEO, use ProductSetSeoScript.
 */
export interface ProductUpdateParams {
  readonly id: string;
  readonly handle?: string;
  readonly title?: string;
  readonly vendorId?: string | null;
}

export type ProductUpdateResult = ScriptResult<Product, ProductIdentityChanges>;
