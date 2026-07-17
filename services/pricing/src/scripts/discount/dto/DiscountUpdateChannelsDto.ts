import type { DiscountChannelInput } from "../../../resolvers/admin/generated/types.js";
import type { DiscountSectionResult } from "../types.js";

export interface DiscountUpdateChannelsParams {
  readonly discountId: string;
  readonly channels: DiscountChannelInput[];
}

export type DiscountUpdateChannelsResult = DiscountSectionResult;
