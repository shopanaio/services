import { CustomerCreateWorkflow } from "./CustomerCreateWorkflow.js";
import { CustomerDeleteWorkflow } from "./CustomerDeleteWorkflow.js";
import {
  CustomerAddressCreateWorkflow,
  CustomerConsentCreateWorkflow,
  CustomerDataRequestCreateWorkflow,
  CustomerGroupCreateWorkflow,
  CustomerMergeCreateWorkflow,
  CustomerSegmentCreateWorkflow,
  CustomerTagCreateWorkflow,
  CustomerTaxExemptionCreateWorkflow,
  CustomerTaxIdentifierCreateWorkflow,
} from "./CustomerEntityCreateWorkflows.js";
import { CustomerUpdateWorkflow } from "./CustomerUpdateWorkflow.js";

export const workflows = [
  CustomerCreateWorkflow,
  CustomerAddressCreateWorkflow,
  CustomerTaxIdentifierCreateWorkflow,
  CustomerTaxExemptionCreateWorkflow,
  CustomerConsentCreateWorkflow,
  CustomerGroupCreateWorkflow,
  CustomerTagCreateWorkflow,
  CustomerSegmentCreateWorkflow,
  CustomerMergeCreateWorkflow,
  CustomerDataRequestCreateWorkflow,
  CustomerUpdateWorkflow,
  CustomerDeleteWorkflow,
];

export { CustomerCreateWorkflow } from "./CustomerCreateWorkflow.js";
export { CustomerDeleteWorkflow } from "./CustomerDeleteWorkflow.js";
export * from "./CustomerEntityCreateWorkflows.js";
export { CustomerUpdateWorkflow } from "./CustomerUpdateWorkflow.js";
export * from "./dto/index.js";
