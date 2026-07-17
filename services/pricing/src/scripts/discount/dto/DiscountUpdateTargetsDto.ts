import type { DiscountTargetSelectionInput } from "../../../resolvers/admin/generated/types.js";
import type { DiscountSectionResult } from "../types.js";

export interface DiscountUpdateTargetsParams {
  readonly discountId: string;
  readonly targetSelections: DiscountTargetSelectionInput[];
}

export type DiscountUpdateTargetsResult = DiscountSectionResult;
