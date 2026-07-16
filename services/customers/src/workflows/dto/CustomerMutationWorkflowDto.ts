import type {
  CustomerGroupCreateParams,
  CustomerGroupCreateResult,
  CustomerGroupDeleteParams,
  CustomerGroupDeleteResult,
  CustomerSegmentCreateParams,
  CustomerSegmentCreateResult,
  CustomerSegmentDeleteParams,
  CustomerSegmentDeleteResult,
  CustomerTagCreateParams,
  CustomerTagCreateResult,
  CustomerTagDeleteParams,
  CustomerTagDeleteResult,
} from "../../scripts/classification/index.js";
import type {
  CustomerCreateParams,
  CustomerCreateResult,
  CustomerDeleteParams,
  CustomerDeleteResult,
} from "../../scripts/customer/dto/index.js";
import type {
  CustomerDataRequestCreateParams,
  CustomerDataRequestCreateResult,
  CustomerDataRequestDeleteParams,
  CustomerDataRequestDeleteResult,
  CustomerMergeCreateParams,
  CustomerMergeCreateResult,
  CustomerMergeDeleteParams,
  CustomerMergeDeleteResult,
} from "../../scripts/lifecycle/index.js";

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

export interface CustomerGroupCreateWorkflowInput {
  params: CustomerGroupCreateParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerGroupCreateWorkflowResult = CustomerGroupCreateResult;

export interface CustomerTagCreateWorkflowInput {
  params: CustomerTagCreateParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerTagCreateWorkflowResult = CustomerTagCreateResult;

export interface CustomerSegmentCreateWorkflowInput {
  params: CustomerSegmentCreateParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerSegmentCreateWorkflowResult = CustomerSegmentCreateResult;

export interface CustomerMergeCreateWorkflowInput {
  params: CustomerMergeCreateParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerMergeCreateWorkflowResult = CustomerMergeCreateResult;

export interface CustomerDataRequestCreateWorkflowInput {
  params: CustomerDataRequestCreateParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerDataRequestCreateWorkflowResult =
  CustomerDataRequestCreateResult;

export interface CustomerGroupDeleteWorkflowInput {
  params: CustomerGroupDeleteParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerGroupDeleteWorkflowResult = CustomerGroupDeleteResult;

export interface CustomerTagDeleteWorkflowInput {
  params: CustomerTagDeleteParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerTagDeleteWorkflowResult = CustomerTagDeleteResult;

export interface CustomerSegmentDeleteWorkflowInput {
  params: CustomerSegmentDeleteParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerSegmentDeleteWorkflowResult = CustomerSegmentDeleteResult;

export interface CustomerMergeDeleteWorkflowInput {
  params: CustomerMergeDeleteParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerMergeDeleteWorkflowResult = CustomerMergeDeleteResult;

export interface CustomerDataRequestDeleteWorkflowInput {
  params: CustomerDataRequestDeleteParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerDataRequestDeleteWorkflowResult =
  CustomerDataRequestDeleteResult;

export interface CustomerDeleteWorkflowInput {
  params: CustomerDeleteParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerDeleteWorkflowResult = CustomerDeleteResult;
