import type {
  CustomerAddressUpdateParams,
  CustomerAddressUpdateResult,
} from "../../scripts/address/index.js";
import type {
  CustomerGroupUpdateParams,
  CustomerGroupUpdateResult,
  CustomerSegmentUpdateParams,
  CustomerSegmentUpdateResult,
  CustomerTagUpdateParams,
  CustomerTagUpdateResult,
} from "../../scripts/classification/index.js";
import type {
  CustomerConsentUpdateParams,
  CustomerConsentUpdateResult,
} from "../../scripts/consent/index.js";
import type {
  CustomerDataRequestUpdateParams,
  CustomerDataRequestUpdateResult,
  CustomerMergeUpdateParams,
  CustomerMergeUpdateResult,
} from "../../scripts/lifecycle/index.js";
import type {
  CustomerTaxExemptionUpdateParams,
  CustomerTaxExemptionUpdateResult,
  CustomerTaxIdentifierUpdateParams,
  CustomerTaxIdentifierUpdateResult,
} from "../../scripts/tax/index.js";
import type { CustomerUpdateOperationResult } from "./CustomerUpdateWorkflowDto.js";
import type { CustomerMutationWorkflowContext } from "./CustomerMutationWorkflowDto.js";

type UpdateWorkflowResult<TResult> = TResult & {
  operationResults: CustomerUpdateOperationResult[];
};

export interface CustomerAddressUpdateWorkflowInput {
  params: CustomerAddressUpdateParams;
  context: CustomerMutationWorkflowContext;
}
export type CustomerAddressUpdateWorkflowResult =
  UpdateWorkflowResult<CustomerAddressUpdateResult>;

export interface CustomerTaxIdentifierUpdateWorkflowInput {
  params: CustomerTaxIdentifierUpdateParams;
  context: CustomerMutationWorkflowContext;
}
export type CustomerTaxIdentifierUpdateWorkflowResult =
  UpdateWorkflowResult<CustomerTaxIdentifierUpdateResult>;

export interface CustomerTaxExemptionUpdateWorkflowInput {
  params: CustomerTaxExemptionUpdateParams;
  context: CustomerMutationWorkflowContext;
}
export type CustomerTaxExemptionUpdateWorkflowResult =
  UpdateWorkflowResult<CustomerTaxExemptionUpdateResult>;

export interface CustomerConsentUpdateWorkflowInput {
  params: CustomerConsentUpdateParams;
  context: CustomerMutationWorkflowContext;
}
export type CustomerConsentUpdateWorkflowResult =
  UpdateWorkflowResult<CustomerConsentUpdateResult>;

export interface CustomerGroupUpdateWorkflowInput {
  params: CustomerGroupUpdateParams;
  context: CustomerMutationWorkflowContext;
}
export type CustomerGroupUpdateWorkflowResult =
  UpdateWorkflowResult<CustomerGroupUpdateResult>;

export interface CustomerTagUpdateWorkflowInput {
  params: CustomerTagUpdateParams;
  context: CustomerMutationWorkflowContext;
}
export type CustomerTagUpdateWorkflowResult =
  UpdateWorkflowResult<CustomerTagUpdateResult>;

export interface CustomerSegmentUpdateWorkflowInput {
  params: CustomerSegmentUpdateParams;
  context: CustomerMutationWorkflowContext;
}
export type CustomerSegmentUpdateWorkflowResult =
  UpdateWorkflowResult<CustomerSegmentUpdateResult>;

export interface CustomerMergeUpdateWorkflowInput {
  params: CustomerMergeUpdateParams;
  context: CustomerMutationWorkflowContext;
}
export type CustomerMergeUpdateWorkflowResult =
  UpdateWorkflowResult<CustomerMergeUpdateResult>;

export interface CustomerDataRequestUpdateWorkflowInput {
  params: CustomerDataRequestUpdateParams;
  context: CustomerMutationWorkflowContext;
}
export type CustomerDataRequestUpdateWorkflowResult =
  UpdateWorkflowResult<CustomerDataRequestUpdateResult>;
