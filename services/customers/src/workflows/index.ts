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
import {
  CustomerAddressUpdateWorkflow,
  CustomerConsentUpdateWorkflow,
  CustomerDataRequestUpdateWorkflow,
  CustomerGroupUpdateWorkflow,
  CustomerMergeUpdateWorkflow,
  CustomerSegmentUpdateWorkflow,
  CustomerTagUpdateWorkflow,
  CustomerTaxExemptionUpdateWorkflow,
  CustomerTaxIdentifierUpdateWorkflow,
} from "./CustomerEntityUpdateWorkflows.js";
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
  CustomerAddressUpdateWorkflow,
  CustomerTaxIdentifierUpdateWorkflow,
  CustomerTaxExemptionUpdateWorkflow,
  CustomerConsentUpdateWorkflow,
  CustomerGroupUpdateWorkflow,
  CustomerTagUpdateWorkflow,
  CustomerSegmentUpdateWorkflow,
  CustomerMergeUpdateWorkflow,
  CustomerDataRequestUpdateWorkflow,
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
export * from "./CustomerEntityUpdateWorkflows.js";
export { CustomerUpdateWorkflow } from "./CustomerUpdateWorkflow.js";
export * from "./dto/index.js";
