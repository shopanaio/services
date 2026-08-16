import { CustomerCreateWorkflow } from "./CustomerCreateWorkflow.js";
import { CustomerDeleteWorkflow } from "./CustomerDeleteWorkflow.js";
import {
  CustomerDataRequestCreateWorkflow,
  CustomerGroupCreateWorkflow,
  CustomerMergeCreateWorkflow,
  CustomerSegmentCreateWorkflow,
  CustomerTagCreateWorkflow,
} from "./CustomerEntityCreateWorkflows.js";
import {
  CustomerDataRequestDeleteWorkflow,
  CustomerGroupDeleteWorkflow,
  CustomerMergeDeleteWorkflow,
  CustomerSegmentDeleteWorkflow,
  CustomerTagDeleteWorkflow,
} from "./CustomerEntityDeleteWorkflows.js";
import {
  CustomerDataRequestUpdateWorkflow,
  CustomerGroupUpdateWorkflow,
  CustomerMergeUpdateWorkflow,
  CustomerSegmentUpdateWorkflow,
  CustomerTagUpdateWorkflow,
} from "./CustomerEntityUpdateWorkflows.js";
import { CustomerUpdateWorkflow } from "./CustomerUpdateWorkflow.js";
import { CustomerProvisionFromIamWorkflow } from "./CustomerProvisionFromIamWorkflow.js";
import { StorefrontAuthProvisionWorkflow } from "./StorefrontAuthProvisionWorkflow.js";
import { StorefrontAuthDeprovisionWorkflow } from "./StorefrontAuthDeprovisionWorkflow.js";
import {
  WishlistCreateWorkflow,
  WishlistDeleteWorkflow,
  WishlistProductAddWorkflow,
  WishlistProductRemoveWorkflow,
  WishlistUpdateWorkflow,
} from "./WishlistWorkflows.js";

export const workflows = [
  CustomerCreateWorkflow,
  CustomerGroupCreateWorkflow,
  CustomerTagCreateWorkflow,
  CustomerSegmentCreateWorkflow,
  CustomerMergeCreateWorkflow,
  CustomerDataRequestCreateWorkflow,
  CustomerGroupUpdateWorkflow,
  CustomerTagUpdateWorkflow,
  CustomerSegmentUpdateWorkflow,
  CustomerMergeUpdateWorkflow,
  CustomerDataRequestUpdateWorkflow,
  CustomerGroupDeleteWorkflow,
  CustomerTagDeleteWorkflow,
  CustomerSegmentDeleteWorkflow,
  CustomerMergeDeleteWorkflow,
  CustomerDataRequestDeleteWorkflow,
  CustomerUpdateWorkflow,
  CustomerProvisionFromIamWorkflow,
  CustomerDeleteWorkflow,
  StorefrontAuthProvisionWorkflow,
  StorefrontAuthDeprovisionWorkflow,
  WishlistCreateWorkflow,
  WishlistUpdateWorkflow,
  WishlistDeleteWorkflow,
  WishlistProductAddWorkflow,
  WishlistProductRemoveWorkflow,
];

export { CustomerCreateWorkflow } from "./CustomerCreateWorkflow.js";
export { CustomerDeleteWorkflow } from "./CustomerDeleteWorkflow.js";
export * from "./CustomerEntityCreateWorkflows.js";
export * from "./CustomerEntityDeleteWorkflows.js";
export * from "./CustomerEntityUpdateWorkflows.js";
export { CustomerUpdateWorkflow } from "./CustomerUpdateWorkflow.js";
export * from "./CustomerProvisionFromIamWorkflow.js";
export * from "./StorefrontAuthProvisionWorkflow.js";
export * from "./StorefrontAuthDeprovisionWorkflow.js";
export * from "./WishlistWorkflows.js";
export * from "./dto/index.js";
