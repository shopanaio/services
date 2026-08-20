import type {
  CustomerComparisonCategoryClearParams,
  CustomerComparisonMutationResult,
  CustomerComparisonVariantAddParams,
  CustomerComparisonVariantRemoveParams,
} from "../../scripts/comparison/index.js";

export interface CustomerComparisonWorkflowContext {
  organizationId: string;
  storeId: string;
  customerId: string;
  locale?: string;
  requestId: string;
}

export interface CustomerComparisonVariantAddWorkflowInput {
  params: Omit<CustomerComparisonVariantAddParams, "customerId">;
  context: CustomerComparisonWorkflowContext;
}
export type CustomerComparisonVariantAddWorkflowResult = CustomerComparisonMutationResult;

export interface CustomerComparisonVariantRemoveWorkflowInput {
  params: Omit<CustomerComparisonVariantRemoveParams, "customerId">;
  context: CustomerComparisonWorkflowContext;
}
export type CustomerComparisonVariantRemoveWorkflowResult = CustomerComparisonMutationResult;

export interface CustomerComparisonCategoryClearWorkflowInput {
  params: Omit<CustomerComparisonCategoryClearParams, "customerId">;
  context: CustomerComparisonWorkflowContext;
}
export type CustomerComparisonCategoryClearWorkflowResult = CustomerComparisonMutationResult;
