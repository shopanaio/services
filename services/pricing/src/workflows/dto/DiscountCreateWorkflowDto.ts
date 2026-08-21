import type { UserError } from "../../kernel/BaseScript.js";
import type { DiscountCreateInput } from "../../resolvers/admin/generated/types.js";
import type { PricingMutationWorkflowContext } from "./DiscountUpdateWorkflowDto.js";

export interface DiscountCreateWorkflowInput {
  input: DiscountCreateInput;
  context: PricingMutationWorkflowContext;
}

export interface DiscountCreateWorkflowResult {
  discount: { id: string } | null;
  userErrors: UserError[];
}
