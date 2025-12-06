import type { ProductOptionValue } from "../../../repositories/models/index.js";
import type { OptionSwatchInput, OptionResultBase } from "./shared.js";

export interface OptionValueCreateParams {
  readonly optionId: string;
  readonly slug: string;
  readonly name: string;
  readonly sortIndex?: number;
  readonly swatch?: OptionSwatchInput;
}

export interface OptionValueCreateResult extends OptionResultBase {
  optionValue?: ProductOptionValue;
}
