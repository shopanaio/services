import type {
  CustomerGroupUpdateParams,
  CustomerGroupUpdateResult,
  CustomerSegmentUpdateParams,
  CustomerSegmentUpdateResult,
  CustomerTagUpdateParams,
  CustomerTagUpdateResult,
} from "../../scripts/classification/index.js";
import type {
  CustomerDataRequestUpdateParams,
  CustomerDataRequestUpdateResult,
  CustomerMergeUpdateParams,
  CustomerMergeUpdateResult,
} from "../../scripts/lifecycle/index.js";
import type { CustomerUpdateOperationResult } from "./CustomerUpdateWorkflowDto.js";
import type { CustomerMutationWorkflowContext } from "./CustomerMutationWorkflowDto.js";

type UpdateWorkflowResult<TResult> = TResult & {
  operationResults: CustomerUpdateOperationResult[];
};

export interface CustomerGroupUpdateWorkflowInput {
  params: CustomerGroupUpdateParams;
  context: CustomerMutationWorkflowContext;
}
export type CustomerGroupUpdateWorkflowResult = UpdateWorkflowResult<CustomerGroupUpdateResult>;

export interface CustomerTagUpdateWorkflowInput {
  params: CustomerTagUpdateParams;
  context: CustomerMutationWorkflowContext;
}
export type CustomerTagUpdateWorkflowResult = UpdateWorkflowResult<CustomerTagUpdateResult>;

export interface CustomerSegmentUpdateWorkflowInput {
  params: CustomerSegmentUpdateParams;
  context: CustomerMutationWorkflowContext;
}
export type CustomerSegmentUpdateWorkflowResult = UpdateWorkflowResult<CustomerSegmentUpdateResult>;

export interface CustomerMergeUpdateWorkflowInput {
  params: CustomerMergeUpdateParams;
  context: CustomerMutationWorkflowContext;
}
export type CustomerMergeUpdateWorkflowResult = UpdateWorkflowResult<CustomerMergeUpdateResult>;

export interface CustomerDataRequestUpdateWorkflowInput {
  params: CustomerDataRequestUpdateParams;
  context: CustomerMutationWorkflowContext;
}
export type CustomerDataRequestUpdateWorkflowResult =
  UpdateWorkflowResult<CustomerDataRequestUpdateResult>;
