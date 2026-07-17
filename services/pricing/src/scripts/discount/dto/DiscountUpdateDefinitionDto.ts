import type { DiscountDefinitionUpdateInput } from "../../../resolvers/admin/generated/types.js";
import type { DiscountSectionResult } from "../types.js";

export interface DiscountUpdateDefinitionParams {
  readonly discountId: string;
  readonly definition: DiscountDefinitionUpdateInput;
}

export type DiscountUpdateDefinitionResult = DiscountSectionResult;
