import type { Product } from "../../../repositories/models/index.js";
import type { ScriptResult, ContentChanges } from "../../types/index.js";
import type { DescriptionInput } from "./shared.js";

/**
 * Parameters for setting product content (description/excerpt).
 */
export interface ProductSetContentParams {
  readonly id: string;
  readonly description?: DescriptionInput;
  readonly excerpt?: string;
}

export type ProductSetContentResult = ScriptResult<Product, ContentChanges>;
