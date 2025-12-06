import type { ProductWithVariants, ProductResultBase } from "./shared.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProductCreateParams {}

export interface ProductCreateResult extends ProductResultBase {
  product?: ProductWithVariants;
}
