import type { DiscountBuyerContextInput } from "../../../resolvers/admin/generated/types.js";
import type { DiscountSectionResult } from "../types.js";

export interface DiscountUpdateEligibilityParams {
  readonly discountId: string;
  readonly eligibility: DiscountBuyerContextInput;
}

export type DiscountUpdateEligibilityResult = DiscountSectionResult;
