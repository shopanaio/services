import type { DiscountRuleInput } from "../../../resolvers/admin/generated/types.js";
import type { DiscountSectionResult } from "../types.js";

export interface DiscountUpdateRuleParams {
  readonly discountId: string;
  readonly rule: DiscountRuleInput;
}

export type DiscountUpdateRuleResult = DiscountSectionResult;
