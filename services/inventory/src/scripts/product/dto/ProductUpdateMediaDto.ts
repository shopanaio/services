import type { Product } from "../../../repositories/models/index.js";
import type { ScriptResult, MediaChanges } from "../../types/index.js";

/**
 * Parameters for updating product media.
 * Media is attached to the default variant.
 */
export interface ProductUpdateMediaParams {
  readonly id: string;
  readonly fileIds: string[];
}

export type ProductUpdateMediaResult = ScriptResult<Product, MediaChanges>;
