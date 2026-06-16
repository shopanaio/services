import type { ProductResultBase } from "./shared.js";

export interface ProductDeleteParams {
  readonly id: string;
  readonly permanent?: boolean;
}

export interface ProductDeleteResult extends ProductResultBase {
  deletedProductId?: string;
}
