import type {
  CustomerAddressCreateParams,
  CustomerAddressCreateResult,
} from "../../scripts/address/index.js";
import type {
  CustomerGroupCreateParams,
  CustomerGroupCreateResult,
  CustomerSegmentCreateParams,
  CustomerSegmentCreateResult,
  CustomerTagCreateParams,
  CustomerTagCreateResult,
} from "../../scripts/classification/index.js";
import type {
  CustomerConsentCreateParams,
  CustomerConsentCreateResult,
} from "../../scripts/consent/index.js";
import type {
  CustomerCreateParams,
  CustomerCreateResult,
  CustomerDeleteParams,
  CustomerDeleteResult,
} from "../../scripts/customer/dto/index.js";
import type {
  CustomerDataRequestCreateParams,
  CustomerDataRequestCreateResult,
  CustomerMergeCreateParams,
  CustomerMergeCreateResult,
} from "../../scripts/lifecycle/index.js";
import type {
  CustomerTaxExemptionCreateParams,
  CustomerTaxExemptionCreateResult,
  CustomerTaxIdentifierCreateParams,
  CustomerTaxIdentifierCreateResult,
} from "../../scripts/tax/index.js";

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

export interface CustomerAddressCreateWorkflowInput {
  params: CustomerAddressCreateParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerAddressCreateWorkflowResult =
  CustomerAddressCreateResult;

export interface CustomerTaxIdentifierCreateWorkflowInput {
  params: CustomerTaxIdentifierCreateParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerTaxIdentifierCreateWorkflowResult =
  CustomerTaxIdentifierCreateResult;

export interface CustomerTaxExemptionCreateWorkflowInput {
  params: CustomerTaxExemptionCreateParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerTaxExemptionCreateWorkflowResult =
  CustomerTaxExemptionCreateResult;

export interface CustomerConsentCreateWorkflowInput {
  params: CustomerConsentCreateParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerConsentCreateWorkflowResult = CustomerConsentCreateResult;

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

export interface CustomerDeleteWorkflowInput {
  params: CustomerDeleteParams;
  context: CustomerMutationWorkflowContext;
}

export type CustomerDeleteWorkflowResult = CustomerDeleteResult;
