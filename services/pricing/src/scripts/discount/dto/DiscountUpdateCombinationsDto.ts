import type { DiscountClass } from "../../../resolvers/admin/generated/types.js";
import type { DiscountSectionResult } from "../types.js";

export interface DiscountUpdateCombinationsParams {
  readonly discountId: string;
  readonly combinations: DiscountClass[];
}

export type DiscountUpdateCombinationsResult = DiscountSectionResult;
