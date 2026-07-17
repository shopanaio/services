import type { UserError } from "../../kernel/BaseScript.js";
import type { PricingMutationWorkflowContext } from "./DiscountUpdateWorkflowDto.js";

export interface DiscountDeleteWorkflowInput {
  discountId: string;
  expectedRevision: number;
  context: PricingMutationWorkflowContext;
}

export interface DiscountDeleteWorkflowResult {
  deletedDiscountId?: string;
  deletedCodeIds: string[];
  userErrors: UserError[];
}
