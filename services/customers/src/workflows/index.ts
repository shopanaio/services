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
import {
  CustomerAddressDeleteWorkflow,
  CustomerConsentDeleteWorkflow,
  CustomerDataRequestDeleteWorkflow,
  CustomerGroupDeleteWorkflow,
  CustomerMergeDeleteWorkflow,
  CustomerSegmentDeleteWorkflow,
  CustomerTagDeleteWorkflow,
  CustomerTaxExemptionDeleteWorkflow,
  CustomerTaxIdentifierDeleteWorkflow,
} from "./CustomerEntityDeleteWorkflows.js";
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
  CustomerAddressDeleteWorkflow,
  CustomerTaxIdentifierDeleteWorkflow,
  CustomerTaxExemptionDeleteWorkflow,
  CustomerConsentDeleteWorkflow,
  CustomerGroupDeleteWorkflow,
  CustomerTagDeleteWorkflow,
  CustomerSegmentDeleteWorkflow,
  CustomerMergeDeleteWorkflow,
  CustomerDataRequestDeleteWorkflow,
  CustomerUpdateWorkflow,
  CustomerDeleteWorkflow,
];

export { CustomerCreateWorkflow } from "./CustomerCreateWorkflow.js";
export { CustomerDeleteWorkflow } from "./CustomerDeleteWorkflow.js";
export * from "./CustomerEntityCreateWorkflows.js";
export * from "./CustomerEntityDeleteWorkflows.js";
export { CustomerUpdateWorkflow } from "./CustomerUpdateWorkflow.js";
export * from "./dto/index.js";
