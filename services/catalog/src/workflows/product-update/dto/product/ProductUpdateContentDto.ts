import type { Product } from "../../../../repositories/models/index.js";
import type { ScriptResult, ContentChanges } from "../../../../scripts/types/index.js";
import type { RichTextInput } from "./shared.js";

/**
 * Parameters for updating product content (description/excerpt).
 */
export interface ProductUpdateContentParams {
  readonly id: string;
  readonly description?: RichTextInput | null;
  readonly excerpt?: RichTextInput | null;
}

export type ProductUpdateContentResult = ScriptResult<Product, ContentChanges>;
