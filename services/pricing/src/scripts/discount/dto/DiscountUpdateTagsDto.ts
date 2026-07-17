import type { DiscountSectionResult } from "../types.js";

export interface DiscountUpdateTagsParams {
  readonly discountId: string;
  readonly tags: string[];
}

export type DiscountUpdateTagsResult = DiscountSectionResult;
