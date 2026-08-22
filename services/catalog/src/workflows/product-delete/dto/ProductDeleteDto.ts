import type { ProductResultBase } from "./ProductSharedDto.js";

export interface ProductDeleteParams {
  readonly id: string;
  readonly permanent?: boolean;
}

export interface ProductDeleteResult extends ProductResultBase {
  deletedProductId?: string;
  categoryIds?: string[];
  deletedAt?: string;
}
