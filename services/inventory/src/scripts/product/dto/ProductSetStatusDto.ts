import type { Product } from "../../../repositories/models/index.js";
import type { ScriptResult, StatusChanges } from "../../types/index.js";

export type ProductStatus = "published" | "draft";

export interface ProductSetStatusParams {
  readonly id: string;
  readonly status: ProductStatus;
}

export type ProductSetStatusResult = ScriptResult<Product, StatusChanges>;
