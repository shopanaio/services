import type { Product } from "../../../repositories/models/index.js";
import type { ScriptResult, MediaChanges } from "../../types/index.js";

/**
 * Parameters for setting product media.
 * Media is attached to the default variant.
 */
export interface ProductSetMediaParams {
  readonly id: string;
  readonly fileIds: string[];
}

export type ProductSetMediaResult = ScriptResult<Product, MediaChanges>;
