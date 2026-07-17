import type { DiscountMinimumRequirementSyncInput } from "../../../resolvers/admin/generated/types.js";
import type { DiscountSectionResult } from "../types.js";

export interface DiscountUpdateMinimumRequirementParams {
  readonly discountId: string;
  readonly minimumRequirement: DiscountMinimumRequirementSyncInput;
}

export type DiscountUpdateMinimumRequirementResult = DiscountSectionResult;
