import type { Product } from "../../../repositories/models/index.js";
import type { DescriptionInput, ProductResultBase } from "./shared.js";

export interface ProductSeoInput {
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
  readonly ogTitle?: string | null;
  readonly ogDescription?: string | null;
  readonly ogImageId?: string | null;
}

export interface ProductUpdateParams {
  readonly id: string;
  readonly handle?: string;
  readonly title?: string;
  readonly description?: DescriptionInput;
  readonly excerpt?: string;
  readonly seo?: ProductSeoInput;
}

export interface ProductUpdateResult extends ProductResultBase {
  product?: Product;
}
