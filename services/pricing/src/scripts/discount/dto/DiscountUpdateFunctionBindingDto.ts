import type { DiscountFunctionBindingInput } from "../../../resolvers/admin/generated/types.js";
import type { DiscountSectionResult } from "../types.js";

export interface DiscountUpdateFunctionBindingParams {
  readonly discountId: string;
  readonly functionBinding: DiscountFunctionBindingInput;
}

export type DiscountUpdateFunctionBindingResult = DiscountSectionResult;
