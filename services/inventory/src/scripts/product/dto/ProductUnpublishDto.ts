import type { Product } from "../../../repositories/models/index.js";
import type { ProductResultBase } from "./shared.js";

export interface ProductUnpublishParams {
  readonly id: string;
}

export interface ProductUnpublishResult extends ProductResultBase {
  product?: Product;
}
