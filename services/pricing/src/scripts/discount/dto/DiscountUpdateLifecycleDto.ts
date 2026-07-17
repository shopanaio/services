import type { DiscountLifecycleUpdateInput } from "../../../resolvers/admin/generated/types.js";
import type { DiscountSectionResult } from "../types.js";

export interface DiscountUpdateLifecycleParams {
  readonly discountId: string;
  readonly lifecycle: DiscountLifecycleUpdateInput;
}

export type DiscountUpdateLifecycleResult = DiscountSectionResult;
