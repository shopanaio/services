import type { Product } from "../../../repositories/models/index.js";
import type { DescriptionInput, ProductResultBase } from "./shared.js";

export interface ProductUpdateParams {
  readonly id: string;
  readonly handle?: string;
  readonly title?: string;
  readonly description?: DescriptionInput;
  readonly excerpt?: string;
  readonly seoTitle?: string;
  readonly seoDescription?: string;
}

export interface ProductUpdateResult extends ProductResultBase {
  product?: Product;
}
