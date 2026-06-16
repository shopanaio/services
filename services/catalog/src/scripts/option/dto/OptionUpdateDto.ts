import type { ProductOption } from "../../../repositories/models/index.js";
import type { OptionValuesInput, OptionResultBase } from "./shared.js";

export interface OptionUpdateParams {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
  readonly displayType?: string;
  readonly values?: OptionValuesInput;
}

export interface OptionUpdateResult extends OptionResultBase {
  option?: ProductOption;
}
