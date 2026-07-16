import { ApolloMutation } from "@shopana/type-resolver";
import { CustomersType } from "./CustomersType.js";

const emptyEntityPayload = (field: string) => ({
  [field]: null,
  userErrors: [],
});

const emptyUpdatePayload = (field: string) => ({
  [field]: null,
  operationResults: [],
  userErrors: [],
});

@ApolloMutation
export class MutationResolver extends CustomersType<Record<string, never>> {
  customersMutation() {
    return new CustomersMutationResolver({}, this.$ctx);
  }
}

export class CustomersMutationResolver extends CustomersType<
  Record<string, never>
> {
  customerCreate() {
    return emptyEntityPayload("customer");
  }

  customerUpdate() {
    return emptyUpdatePayload("customer");
  }

  customerAddressCreate() {
    return emptyEntityPayload("address");
  }

  customerAddressUpdate() {
    return emptyUpdatePayload("address");
  }

  customerAddressDelete() {
    return {
      deletedAddressId: null,
      userErrors: [],
    };
  }

  customerAddressDefaultsUpdate() {
    return emptyEntityPayload("customer");
  }

  customerTaxIdentifierCreate() {
    return emptyEntityPayload("taxIdentifier");
  }

  customerTaxIdentifierUpdate() {
    return emptyUpdatePayload("taxIdentifier");
  }

  customerTaxIdentifierDelete() {
    return {
      deletedTaxIdentifierId: null,
      userErrors: [],
    };
  }

  customerTaxExemptionCreate() {
    return emptyEntityPayload("taxExemption");
  }

  customerTaxExemptionUpdate() {
    return emptyUpdatePayload("taxExemption");
  }

  customerTaxExemptionDelete() {
    return {
      deletedTaxExemptionId: null,
      userErrors: [],
    };
  }

  customerConsentSet() {
    return {
      consent: null,
      event: null,
      userErrors: [],
    };
  }

  customerGroupCreate() {
    return emptyEntityPayload("group");
  }

  customerGroupUpdate() {
    return emptyUpdatePayload("group");
  }

  customerGroupDelete() {
    return {
      deletedGroupId: null,
      userErrors: [],
    };
  }

  customerGroupMembershipSet() {
    return emptyEntityPayload("membership");
  }

  customerGroupMembershipDelete() {
    return {
      deletedMembershipId: null,
      userErrors: [],
    };
  }

  customerTagCreate() {
    return emptyEntityPayload("tag");
  }

  customerTagUpdate() {
    return emptyUpdatePayload("tag");
  }

  customerTagDelete() {
    return {
      deletedTagId: null,
      userErrors: [],
    };
  }

  customerTagAssign() {
    return emptyEntityPayload("assignment");
  }

  customerTagUnassign() {
    return {
      deletedAssignmentId: null,
      userErrors: [],
    };
  }

  customerSegmentCreate() {
    return emptyEntityPayload("segment");
  }

  customerSegmentUpdate() {
    return emptyUpdatePayload("segment");
  }

  customerSegmentDelete() {
    return {
      deletedSegmentId: null,
      userErrors: [],
    };
  }

  customerSegmentCustomersAdd() {
    return {
      segment: null,
      customers: [],
      userErrors: [],
    };
  }

  customerSegmentCustomersRemove() {
    return {
      segment: null,
      removedCustomerIds: [],
      userErrors: [],
    };
  }

  customerSegmentCustomersSet() {
    return {
      segment: null,
      customers: [],
      userErrors: [],
    };
  }

  customerMergeRequest() {
    return emptyEntityPayload("merge");
  }

  customerDataRequestCreate() {
    return emptyEntityPayload("dataRequest");
  }

  customerDataRequestCancel() {
    return emptyEntityPayload("dataRequest");
  }
}
