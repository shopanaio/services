import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation } from "@shopana/type-resolver";
import type {
  CustomerUpdateOperation,
  CustomerUpdateWorkflowInput,
  CustomerUpdateWorkflowResult,
} from "../../workflows/dto/index.js";
import { CustomerResolver } from "./CustomerResolver.js";
import { CustomersType } from "./CustomersType.js";
import type { CustomersMutationCustomerUpdateArgs } from "./generated/types.js";
import { mapCustomerUpdateInput } from "./customerUpdateMapper.js";

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

  async customerUpdate(args: CustomersMutationCustomerUpdateArgs) {
    const mapped = mapCustomerUpdateInput(args.operations);
    const customerId = safeDecodeCustomerId(args.customerId);

    if (!customerId) {
      const error = {
        message: "Invalid ID format",
        field: ["customerId"],
        code: "INVALID_ID",
      };
      return {
        customer: null,
        operationResults: mapped.entries.map((entry) => ({
          type: toGraphqlOperationType(entry.type),
          applied: false,
          errors: entry.errors,
        })),
        userErrors: [error, ...mapped.errors],
      };
    }

    if (mapped.errors.length > 0) {
      return {
        customer: null,
        operationResults: mapped.entries.map((entry) => ({
          type: toGraphqlOperationType(entry.type),
          applied: false,
          errors: entry.errors,
        })),
        userErrors: mapped.errors,
      };
    }

    const workflowInput: CustomerUpdateWorkflowInput = {
      customerId,
      expectedRevision: args.expectedRevision ?? undefined,
      operations: mapped.operations,
      context: {
        organizationId: this.$ctx.store.organizationId,
        storeId: this.$ctx.store.id,
        userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
        locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
        requestId: this.$ctx.requestId,
      },
    };

    const result = (await this.$ctx.kernel
      .getServices()
      .broker.runWorkflow(
        "customers.customerUpdate",
        workflowInput,
        {
          source: "workflow",
          workflowId: `customerUpdate:${customerId}:${this.$ctx.requestId}`,
          stepId: "start",
        }
      )) as CustomerUpdateWorkflowResult;

    this.$ctx.loaders.customer.clear(customerId);
    return {
      customer: result.customer
        ? new CustomerResolver(result.customer.id, this.$ctx)
        : null,
      operationResults: result.operationResults.map((operation) => ({
        type: toGraphqlOperationType(operation.type),
        applied: operation.applied,
        errors: operation.errors,
      })),
      userErrors: result.userErrors,
    };
  }

  customerDelete() {
    return {
      deletedCustomerId: null,
      userErrors: [],
    };
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

  customerConsentCreate() {
    return {
      consent: null,
      event: null,
      userErrors: [],
    };
  }

  customerConsentUpdate() {
    return {
      consent: null,
      event: null,
      operationResults: [],
      userErrors: [],
    };
  }

  customerConsentDelete() {
    return {
      deletedConsentId: null,
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

  customerMergeCreate() {
    return emptyEntityPayload("merge");
  }

  customerMergeUpdate() {
    return emptyUpdatePayload("merge");
  }

  customerMergeDelete() {
    return {
      deletedMergeId: null,
      userErrors: [],
    };
  }

  customerDataRequestCreate() {
    return emptyEntityPayload("dataRequest");
  }

  customerDataRequestUpdate() {
    return emptyUpdatePayload("dataRequest");
  }

  customerDataRequestDelete() {
    return {
      deletedDataRequestId: null,
      userErrors: [],
    };
  }
}

function safeDecodeCustomerId(globalId: string): string | null {
  try {
    return decodeGlobalIdByType(globalId, GlobalIdEntity.Customer);
  } catch {
    return null;
  }
}

function toGraphqlOperationType(type: CustomerUpdateOperation["type"]) {
  const types: Record<CustomerUpdateOperation["type"], string> = {
    profileUpdate: "PROFILE_UPDATE",
    contactUpdate: "CONTACT_UPDATE",
    companyUpdate: "COMPANY_UPDATE",
    statusUpdate: "STATUS_UPDATE",
    noteUpdate: "NOTE_UPDATE",
    moderationUpdate: "MODERATION_UPDATE",
    addressUpdate: "ADDRESS_UPDATE",
    consentUpdate: "CONSENT_UPDATE",
    taxIdentifierUpdate: "TAX_IDENTIFIER_UPDATE",
    taxExemptionUpdate: "TAX_EXEMPTION_UPDATE",
    groupUpdate: "GROUP_UPDATE",
    tagUpdate: "TAG_UPDATE",
    segmentUpdate: "SEGMENT_UPDATE",
  };
  return types[type];
}
