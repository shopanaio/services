import type { UserError } from "../../../kernel/BaseScript.js";
import type { DiscountCreateInput } from "../../../resolvers/admin/generated/types.js";

export interface DiscountCreateParams {
  readonly discountId: string;
  readonly input: DiscountCreateInput;
  readonly createdById?: string;
}

export interface DiscountCreateResult {
  discount?: { id: string; revision: number };
  userErrors: UserError[];
}
