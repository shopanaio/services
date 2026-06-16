import type { Product, ProductOption } from "../../../repositories/models/index.js";
import type { OptionResultBase, OptionSwatchInput } from "./shared.js";

export interface OptionValueSyncInput {
  readonly id?: string;
  readonly index: number;
  readonly slug: string;
  readonly name: string;
  readonly swatch?: OptionSwatchInput | null;
}

export interface OptionSyncItemInput {
  readonly id?: string;
  readonly index: number;
  readonly slug: string;
  readonly name: string;
  readonly displayType: string;
  readonly values: OptionValueSyncInput[];
}

export interface OptionSyncParams {
  readonly productId: string;
  readonly options: OptionSyncItemInput[];
}

export interface OptionSyncResult extends OptionResultBase {
  product?: Product;
  options: ProductOption[];
}
