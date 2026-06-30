import type { ProductOption } from "../../../repositories/models/index.js";
import type { OptionValueInput, OptionResultBase } from "./shared.js";

export interface OptionCreateParams {
  readonly productId: string;
  readonly slug: string;
  readonly name: string;
  readonly displayType: string;
  readonly sortIndex?: number;
  readonly values: OptionValueInput[];
}

export interface OptionCreateResult extends OptionResultBase {
  option?: ProductOption;
}
