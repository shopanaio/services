import type { DiscountCodesUpdateInput } from "../../../resolvers/admin/generated/types.js";
import type { DiscountSectionResult } from "../types.js";

export interface DiscountUpdateCodesParams {
  readonly discountId: string;
  readonly codes: DiscountCodesUpdateInput;
}

export type DiscountUpdateCodesResult = DiscountSectionResult;
