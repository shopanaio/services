import type { Product } from "../../../repositories/models/index.js";
import type { ScriptResult, ContentChanges } from "../../types/index.js";
import type { DescriptionInput } from "./shared.js";

/**
 * Parameters for updating product content (description/excerpt).
 */
export interface ProductUpdateContentParams {
  readonly id: string;
  readonly description?: DescriptionInput;
  readonly excerpt?: string;
}

export type ProductUpdateContentResult = ScriptResult<Product, ContentChanges>;
