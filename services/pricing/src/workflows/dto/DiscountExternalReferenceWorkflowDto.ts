import type {
  DiscountExternalReferenceCreateParams,
  DiscountExternalReferenceCreateResult,
  DiscountExternalReferenceDeleteParams,
  DiscountExternalReferenceDeleteResult,
  DiscountExternalReferenceUpdateParams,
  DiscountExternalReferenceUpdateResult,
} from "../../scripts/discount/dto/index.js";
import type { PricingMutationWorkflowContext } from "./DiscountUpdateWorkflowDto.js";

export interface DiscountExternalReferenceCreateWorkflowInput {
  params: Omit<DiscountExternalReferenceCreateParams, "externalReferenceId">;
  context: PricingMutationWorkflowContext;
}

export type DiscountExternalReferenceCreateWorkflowResult = DiscountExternalReferenceCreateResult;

export interface DiscountExternalReferenceUpdateWorkflowInput {
  params: DiscountExternalReferenceUpdateParams;
  context: PricingMutationWorkflowContext;
}

export type DiscountExternalReferenceUpdateWorkflowResult =
  DiscountExternalReferenceUpdateResult & {
    operationResults: Array<{
      type: "discountExternalReferenceUpdate";
      applied: boolean;
      errors: DiscountExternalReferenceUpdateResult["userErrors"];
    }>;
  };

export interface DiscountExternalReferenceDeleteWorkflowInput {
  params: DiscountExternalReferenceDeleteParams;
  context: PricingMutationWorkflowContext;
}

export type DiscountExternalReferenceDeleteWorkflowResult = DiscountExternalReferenceDeleteResult;
