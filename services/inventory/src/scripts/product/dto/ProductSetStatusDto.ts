import type { Product } from "../../../repositories/models/index.js";
import type { ProductResultBase } from "./shared.js";

export type ProductStatusAction = "PUBLISH" | "UNPUBLISH";

export interface ProductSetStatusParams {
  readonly productId: string;
  readonly action: ProductStatusAction;
}

export interface ProductSetStatusResult extends ProductResultBase {
  product?: Product;
}
