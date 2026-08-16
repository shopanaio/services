import { CustomerCreateWorkflow } from "./CustomerCreateWorkflow.js";
import { CustomerDeleteWorkflow } from "./CustomerDeleteWorkflow.js";
import { CustomerExternalReferenceSyncWorkflow } from "./CustomerExternalReferenceSyncWorkflow.js";
import {
  CustomerComparisonCategoryClearWorkflow,
  CustomerComparisonVariantAddWorkflow,
  CustomerComparisonVariantRemoveWorkflow,
} from "./CustomerComparisonWorkflows.js";
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
import { CustomerIamLifecycleWorkflow } from "./CustomerIamLifecycleWorkflow.js";
import { CustomerStatisticsProjectionWorkflow } from "./CustomerStatisticsProjectionWorkflow.js";
import { CustomerMergeProcessWorkflow } from "./CustomerMergeProcessWorkflow.js";
import { CustomerDataRequestProcessWorkflow } from "./CustomerDataRequestProcessWorkflow.js";
import { StorefrontAuthProvisionWorkflow } from "./StorefrontAuthProvisionWorkflow.js";
import { StorefrontAuthDeprovisionWorkflow } from "./StorefrontAuthDeprovisionWorkflow.js";
import {
  WishlistCreateWorkflow,
  WishlistDeleteWorkflow,
  WishlistProductAddWorkflow,
  WishlistProductRemoveWorkflow,
  WishlistUpdateWorkflow,
} from "./WishlistWorkflows.js";
import {
  StorefrontCustomerAddressCreateWorkflow,
  StorefrontCustomerAddressDefaultSetWorkflow,
  StorefrontCustomerAddressDeleteWorkflow,
  StorefrontCustomerAddressUpdateWorkflow,
  StorefrontCustomerDataRequestCancelWorkflow,
  StorefrontCustomerDataRequestCreateWorkflow,
  StorefrontCustomerMarketingConsentUpdateWorkflow,
  StorefrontCustomerTaxIdentifierCreateWorkflow,
  StorefrontCustomerTaxIdentifierDeleteWorkflow,
  StorefrontCustomerTaxIdentifierUpdateWorkflow,
  StorefrontCustomerUpdateWorkflow,
} from "./StorefrontCustomerWorkflows.js";
import {
  CustomerSegmentMaintenanceWorkflow,
  CustomerSegmentMaterializationWorkflow,
} from "./CustomerSegmentWorkerWorkflows.js";

export const workflows = [
  CustomerCreateWorkflow,
  CustomerGroupCreateWorkflow,
  CustomerTagCreateWorkflow,
  CustomerSegmentCreateWorkflow,
  CustomerSegmentMaterializationWorkflow,
  CustomerSegmentMaintenanceWorkflow,
  CustomerMergeCreateWorkflow,
  CustomerMergeProcessWorkflow,
  CustomerDataRequestProcessWorkflow,
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
  CustomerIamLifecycleWorkflow,
  CustomerStatisticsProjectionWorkflow,
  CustomerDeleteWorkflow,
  CustomerExternalReferenceSyncWorkflow,
  StorefrontAuthProvisionWorkflow,
  StorefrontAuthDeprovisionWorkflow,
  WishlistCreateWorkflow,
  WishlistUpdateWorkflow,
  WishlistDeleteWorkflow,
  WishlistProductAddWorkflow,
  WishlistProductRemoveWorkflow,
  CustomerComparisonVariantAddWorkflow,
  CustomerComparisonVariantRemoveWorkflow,
  CustomerComparisonCategoryClearWorkflow,
  StorefrontCustomerUpdateWorkflow,
  StorefrontCustomerAddressCreateWorkflow,
  StorefrontCustomerAddressUpdateWorkflow,
  StorefrontCustomerAddressDeleteWorkflow,
  StorefrontCustomerAddressDefaultSetWorkflow,
  StorefrontCustomerMarketingConsentUpdateWorkflow,
  StorefrontCustomerDataRequestCreateWorkflow,
  StorefrontCustomerDataRequestCancelWorkflow,
  StorefrontCustomerTaxIdentifierCreateWorkflow,
  StorefrontCustomerTaxIdentifierUpdateWorkflow,
  StorefrontCustomerTaxIdentifierDeleteWorkflow,
];

export { CustomerCreateWorkflow } from "./CustomerCreateWorkflow.js";
export { CustomerDeleteWorkflow } from "./CustomerDeleteWorkflow.js";
export { CustomerExternalReferenceSyncWorkflow } from "./CustomerExternalReferenceSyncWorkflow.js";
export * from "./CustomerEntityCreateWorkflows.js";
export * from "./CustomerEntityDeleteWorkflows.js";
export * from "./CustomerEntityUpdateWorkflows.js";
export { CustomerUpdateWorkflow } from "./CustomerUpdateWorkflow.js";
export * from "./CustomerProvisionFromIamWorkflow.js";
export * from "./CustomerIamLifecycleWorkflow.js";
export * from "./CustomerStatisticsProjectionWorkflow.js";
export * from "./StorefrontAuthProvisionWorkflow.js";
export * from "./StorefrontAuthDeprovisionWorkflow.js";
export * from "./WishlistWorkflows.js";
export * from "./CustomerComparisonWorkflows.js";
export * from "./CustomerMergeProcessWorkflow.js";
export * from "./CustomerDataRequestProcessWorkflow.js";
export * from "./StorefrontCustomerWorkflows.js";
export * from "./CustomerSegmentWorkerWorkflows.js";
export * from "./dto/index.js";
