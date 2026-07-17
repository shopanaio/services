import type { DiscountSectionResult } from "../types.js";

export interface DiscountUpdateMetadataParams {
  readonly discountId: string;
  readonly metadata: Record<string, unknown>;
}

export type DiscountUpdateMetadataResult = DiscountSectionResult;
