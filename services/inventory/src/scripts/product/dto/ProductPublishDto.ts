import type { Product } from "../../../repositories/models/index.js";
import type { ProductResultBase } from "./shared.js";

export interface ProductPublishParams {
  readonly id: string;
}

export interface ProductPublishResult extends ProductResultBase {
  product?: Product;
}
