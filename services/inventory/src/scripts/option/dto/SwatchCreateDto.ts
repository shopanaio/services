import type { ProductOptionSwatch } from "../../../repositories/models/index.js";
import type { OptionResultBase } from "./shared.js";

export interface SwatchCreateParams {
  readonly swatchType: string;
  readonly colorOne?: string;
  readonly colorTwo?: string;
  readonly fileId?: string;
  readonly metadata?: unknown;
}

export interface SwatchCreateResult extends OptionResultBase {
  swatch?: ProductOptionSwatch;
}
