import type { ProductOptionValue } from "../../../repositories/models/index.js";
import type { OptionSwatchInput, OptionResultBase } from "./shared.js";

export interface OptionValueUpdateParams {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
  readonly swatch?: OptionSwatchInput | null;
}

export interface OptionValueUpdateResult extends OptionResultBase {
  optionValue?: ProductOptionValue;
}
