import type {
  CustomerCreateParams,
  CustomerCreateResult,
  CustomerDeleteParams,
  CustomerDeleteResult,
} from "../../scripts/customer/dto/index.js";

export interface CustomerMutationWorkflowContext {
  organizationId: string;
  storeId: string;
  userId?: string;
  locale?: string;
  requestId: string;
}

export interface CustomerCreateWorkflowInput {
  params: CustomerCreateParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerCreateWorkflowResult = CustomerCreateResult;

export interface CustomerDeleteWorkflowInput {
  params: CustomerDeleteParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerDeleteWorkflowResult = CustomerDeleteResult;
