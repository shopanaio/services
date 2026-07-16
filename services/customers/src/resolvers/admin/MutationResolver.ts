import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import type {
  CustomerAddressCreateWorkflowInput,
  CustomerAddressCreateWorkflowResult,
  CustomerConsentCreateWorkflowInput,
  CustomerConsentCreateWorkflowResult,
  CustomerCreateWorkflowInput,
  CustomerCreateWorkflowResult,
  CustomerDataRequestCreateWorkflowInput,
  CustomerDataRequestCreateWorkflowResult,
  CustomerDeleteWorkflowInput,
  CustomerDeleteWorkflowResult,
  CustomerGroupCreateWorkflowInput,
  CustomerGroupCreateWorkflowResult,
  CustomerMergeCreateWorkflowInput,
  CustomerMergeCreateWorkflowResult,
  CustomerMutationWorkflowContext,
  CustomerSegmentCreateWorkflowInput,
  CustomerSegmentCreateWorkflowResult,
  CustomerTagCreateWorkflowInput,
  CustomerTagCreateWorkflowResult,
  CustomerTaxExemptionCreateWorkflowInput,
  CustomerTaxExemptionCreateWorkflowResult,
  CustomerTaxIdentifierCreateWorkflowInput,
  CustomerTaxIdentifierCreateWorkflowResult,
  CustomerUpdateOperation,
  CustomerUpdateWorkflowInput,
  CustomerUpdateWorkflowResult,
} from "../../workflows/dto/index.js";
import { CustomerAddressResolver } from "./CustomerAddressResolver.js";
import { CustomerConsentEventResolver } from "./CustomerConsentEventResolver.js";
import { CustomerConsentResolver } from "./CustomerConsentResolver.js";
import { CustomerDataRequestResolver } from "./CustomerDataRequestResolver.js";
import { CustomerGroupResolver } from "./CustomerGroupResolver.js";
import { CustomerMergeResolver } from "./CustomerMergeResolver.js";
import { CustomerResolver } from "./CustomerResolver.js";
import { CustomerSegmentResolver } from "./CustomerSegmentResolver.js";
import { CustomerTagResolver } from "./CustomerTagResolver.js";
import { CustomerTaxExemptionResolver } from "./CustomerTaxExemptionResolver.js";
import { CustomerTaxIdentifierResolver } from "./CustomerTaxIdentifierResolver.js";
import { CustomersType } from "./CustomersType.js";
import {
  CustomerAddressCreateInputSchema,
  CustomerConsentCreateInputSchema,
  CustomerCreateInputSchema,
  CustomerDataRequestCreateInputSchema,
  CustomerDeleteInputSchema,
  CustomerGroupCreateInputSchema,
  CustomerMergeCreateInputSchema,
  CustomerSegmentCreateInputSchema,
  CustomerTagCreateInputSchema,
  CustomerTaxExemptionCreateInputSchema,
  CustomerTaxIdentifierCreateInputSchema,
} from "./generated/schemas.js";
import type {
  CustomersMutationCustomerAddressCreateArgs,
  CustomersMutationCustomerConsentCreateArgs,
  CustomersMutationCustomerCreateArgs,
  CustomersMutationCustomerDataRequestCreateArgs,
  CustomersMutationCustomerDeleteArgs,
  CustomersMutationCustomerGroupCreateArgs,
  CustomersMutationCustomerMergeCreateArgs,
  CustomersMutationCustomerSegmentCreateArgs,
  CustomersMutationCustomerTagCreateArgs,
  CustomersMutationCustomerTaxExemptionCreateArgs,
  CustomersMutationCustomerTaxIdentifierCreateArgs,
  CustomersMutationCustomerUpdateArgs,
} from "./generated/types.js";
import { mapCustomerUpdateInput } from "./customerUpdateMapper.js";

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
  @ZodResolver(CustomerCreateInputSchema())
  async customerCreate(args: CustomersMutationCustomerCreateArgs) {
    const workflowInput: CustomerCreateWorkflowInput = {
      params: {
        ...args.input,
        source: "admin",
        createdByUserId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
      },
      context: this.mutationWorkflowContext(),
    };

    const result = (await this.$ctx.kernel
      .getServices()
      .broker.runWorkflow(
        "customers.customerCreate",
        workflowInput,
        {
          source: "workflow",
          workflowId: `customerCreate:${this.$ctx.store.id}:${this.$ctx.requestId}`,
          stepId: "start",
        }
      )) as CustomerCreateWorkflowResult;

    return {
      customer: result.customer
        ? new CustomerResolver(result.customer.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
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
      context: this.mutationWorkflowContext(),
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

  @ZodResolver(CustomerDeleteInputSchema())
  async customerDelete(args: CustomersMutationCustomerDeleteArgs) {
    const customerId = safeDecodeCustomerId(args.input.id);
    if (!customerId) {
      return {
        deletedCustomerId: null,
        userErrors: [
          {
            message: "Invalid ID format",
            field: ["input", "id"],
            code: "INVALID_ID",
          },
        ],
      };
    }

    const workflowInput: CustomerDeleteWorkflowInput = {
      params: {
        id: customerId,
        expectedRevision: args.input.expectedRevision ?? undefined,
      },
      context: this.mutationWorkflowContext(),
    };
    const result = (await this.$ctx.kernel
      .getServices()
      .broker.runWorkflow(
        "customers.customerDelete",
        workflowInput,
        {
          source: "workflow",
          workflowId: `customerDelete:${customerId}:${this.$ctx.requestId}`,
          stepId: "start",
        }
      )) as CustomerDeleteWorkflowResult;

    this.$ctx.loaders.customer.clear(customerId);
    return {
      deletedCustomerId: result.deletedCustomerId
        ? encodeGlobalIdByType(
            result.deletedCustomerId,
            GlobalIdEntity.Customer
          )
        : null,
      userErrors: result.userErrors,
    };
  }

  private mutationWorkflowContext(): CustomerMutationWorkflowContext {
    return {
      organizationId: this.$ctx.store.organizationId,
      storeId: this.$ctx.store.id,
      userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
      locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
      requestId: this.$ctx.requestId,
    };
  }

  private async runCreateWorkflow<TResult>(
    operation: string,
    input: unknown
  ): Promise<TResult> {
    return (await this.$ctx.kernel
      .getServices()
      .broker.runWorkflow(
        `customers.${operation}`,
        input,
        {
          source: "workflow",
          workflowId: `${operation}:${this.$ctx.store.id}:${this.$ctx.requestId}`,
          stepId: "start",
        }
      )) as TResult;
  }

  @ZodResolver(CustomerAddressCreateInputSchema())
  async customerAddressCreate(
    args: CustomersMutationCustomerAddressCreateArgs
  ) {
    const customerId = safeDecodeId(
      args.input.customerId,
      GlobalIdEntity.Customer
    );
    if (!customerId) {
      return invalidCreatePayload("address", ["customerId"]);
    }

    const workflowInput: CustomerAddressCreateWorkflowInput = {
      params: {
        ...args.input,
        customerId,
        isDefaultShipping: args.input.isDefaultShipping ?? false,
        isDefaultBilling: args.input.isDefaultBilling ?? false,
      },
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runCreateWorkflow<CustomerAddressCreateWorkflowResult>(
      "customerAddressCreate",
      workflowInput
    );
    return {
      address: result.address
        ? new CustomerAddressResolver(result.address.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
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

  @ZodResolver(CustomerTaxIdentifierCreateInputSchema())
  async customerTaxIdentifierCreate(
    args: CustomersMutationCustomerTaxIdentifierCreateArgs
  ) {
    const customerId = safeDecodeId(
      args.input.customerId,
      GlobalIdEntity.Customer
    );
    if (!customerId) {
      return invalidCreatePayload("taxIdentifier", ["customerId"]);
    }

    const workflowInput: CustomerTaxIdentifierCreateWorkflowInput = {
      params: {
        ...args.input,
        customerId,
        status: args.input.status
          ? (String(args.input.status) as CustomerTaxIdentifierCreateWorkflowInput["params"]["status"])
          : undefined,
        isPrimary: args.input.isPrimary ?? false,
      },
      context: this.mutationWorkflowContext(),
    };
    const result =
      await this.runCreateWorkflow<CustomerTaxIdentifierCreateWorkflowResult>(
        "customerTaxIdentifierCreate",
        workflowInput
      );
    return {
      taxIdentifier: result.taxIdentifier
        ? new CustomerTaxIdentifierResolver(result.taxIdentifier.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
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

  @ZodResolver(CustomerTaxExemptionCreateInputSchema())
  async customerTaxExemptionCreate(
    args: CustomersMutationCustomerTaxExemptionCreateArgs
  ) {
    const customerId = safeDecodeId(
      args.input.customerId,
      GlobalIdEntity.Customer
    );
    const certificateFileId = args.input.certificateFileId
      ? safeDecodeId(args.input.certificateFileId, GlobalIdEntity.File)
      : null;
    const errors = [
      ...(!customerId ? [invalidIdError(["customerId"])] : []),
      ...(args.input.certificateFileId && !certificateFileId
        ? [invalidIdError(["certificateFileId"])]
        : []),
    ];
    if (!customerId || errors.length > 0) {
      return { taxExemption: null, userErrors: errors };
    }

    const workflowInput: CustomerTaxExemptionCreateWorkflowInput = {
      params: {
        ...args.input,
        customerId,
        certificateFileId,
        status: args.input.status
          ? (String(args.input.status) as CustomerTaxExemptionCreateWorkflowInput["params"]["status"])
          : undefined,
      },
      context: this.mutationWorkflowContext(),
    };
    const result =
      await this.runCreateWorkflow<CustomerTaxExemptionCreateWorkflowResult>(
        "customerTaxExemptionCreate",
        workflowInput
      );
    return {
      taxExemption: result.taxExemption
        ? new CustomerTaxExemptionResolver(result.taxExemption.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
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

  @ZodResolver(CustomerConsentCreateInputSchema())
  async customerConsentCreate(
    args: CustomersMutationCustomerConsentCreateArgs
  ) {
    const customerId = safeDecodeId(
      args.input.customerId,
      GlobalIdEntity.Customer
    );
    if (!customerId) {
      return {
        consent: null,
        event: null,
        userErrors: [invalidIdError(["customerId"])],
      };
    }

    const workflowInput: CustomerConsentCreateWorkflowInput = {
      params: {
        ...args.input,
        customerId,
        channel: String(args.input.channel) as CustomerConsentCreateWorkflowInput["params"]["channel"],
        state: String(args.input.state) as CustomerConsentCreateWorkflowInput["params"]["state"],
        optInLevel: args.input.optInLevel
          ? (String(args.input.optInLevel) as CustomerConsentCreateWorkflowInput["params"]["optInLevel"])
          : undefined,
        evidence: args.input.evidence ?? undefined,
      },
      context: this.mutationWorkflowContext(),
    };
    const result =
      await this.runCreateWorkflow<CustomerConsentCreateWorkflowResult>(
        "customerConsentCreate",
        workflowInput
      );
    return {
      consent: result.consent
        ? new CustomerConsentResolver(result.consent.id, this.$ctx)
        : null,
      event: result.event
        ? new CustomerConsentEventResolver(result.event.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
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

  @ZodResolver(CustomerGroupCreateInputSchema())
  async customerGroupCreate(args: CustomersMutationCustomerGroupCreateArgs) {
    const workflowInput: CustomerGroupCreateWorkflowInput = {
      params: {
        ...args.input,
        isDefault: args.input.isDefault ?? false,
        isActive: args.input.isActive ?? true,
      },
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runCreateWorkflow<CustomerGroupCreateWorkflowResult>(
      "customerGroupCreate",
      workflowInput
    );
    return {
      group: result.group
        ? new CustomerGroupResolver(result.group.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
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

  @ZodResolver(CustomerTagCreateInputSchema())
  async customerTagCreate(args: CustomersMutationCustomerTagCreateArgs) {
    const workflowInput: CustomerTagCreateWorkflowInput = {
      params: args.input,
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runCreateWorkflow<CustomerTagCreateWorkflowResult>(
      "customerTagCreate",
      workflowInput
    );
    return {
      tag: result.tag
        ? new CustomerTagResolver(result.tag.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
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

  @ZodResolver(CustomerSegmentCreateInputSchema())
  async customerSegmentCreate(
    args: CustomersMutationCustomerSegmentCreateArgs
  ) {
    const workflowInput: CustomerSegmentCreateWorkflowInput = {
      params: {
        ...args.input,
        type: String(args.input.type) as CustomerSegmentCreateWorkflowInput["params"]["type"],
        status: args.input.status
          ? (String(args.input.status) as CustomerSegmentCreateWorkflowInput["params"]["status"])
          : undefined,
        definition: args.input.definition ?? undefined,
        createdById: this.$ctx.hasUser ? this.$ctx.user.id : null,
      },
      context: this.mutationWorkflowContext(),
    };
    const result =
      await this.runCreateWorkflow<CustomerSegmentCreateWorkflowResult>(
        "customerSegmentCreate",
        workflowInput
      );
    return {
      segment: result.segment
        ? new CustomerSegmentResolver(result.segment.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
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

  @ZodResolver(CustomerMergeCreateInputSchema())
  async customerMergeCreate(args: CustomersMutationCustomerMergeCreateArgs) {
    const sourceCustomerId = safeDecodeId(
      args.input.sourceCustomerId,
      GlobalIdEntity.Customer
    );
    const targetCustomerId = safeDecodeId(
      args.input.targetCustomerId,
      GlobalIdEntity.Customer
    );
    const errors = [
      ...(!sourceCustomerId
        ? [invalidIdError(["sourceCustomerId"])]
        : []),
      ...(!targetCustomerId
        ? [invalidIdError(["targetCustomerId"])]
        : []),
    ];
    if (!sourceCustomerId || !targetCustomerId) {
      return { merge: null, userErrors: errors };
    }

    const workflowInput: CustomerMergeCreateWorkflowInput = {
      params: {
        ...args.input,
        sourceCustomerId,
        targetCustomerId,
      },
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runCreateWorkflow<CustomerMergeCreateWorkflowResult>(
      "customerMergeCreate",
      workflowInput
    );
    return {
      merge: result.merge
        ? new CustomerMergeResolver(result.merge.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
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

  @ZodResolver(CustomerDataRequestCreateInputSchema())
  async customerDataRequestCreate(
    args: CustomersMutationCustomerDataRequestCreateArgs
  ) {
    const customerId = safeDecodeId(
      args.input.customerId,
      GlobalIdEntity.Customer
    );
    if (!customerId) {
      return invalidCreatePayload("dataRequest", ["customerId"]);
    }

    const workflowInput: CustomerDataRequestCreateWorkflowInput = {
      params: {
        ...args.input,
        customerId,
        type: String(args.input.type) as CustomerDataRequestCreateWorkflowInput["params"]["type"],
        requestMetadata: args.input.requestMetadata ?? undefined,
      },
      context: this.mutationWorkflowContext(),
    };
    const result =
      await this.runCreateWorkflow<CustomerDataRequestCreateWorkflowResult>(
        "customerDataRequestCreate",
        workflowInput
      );
    return {
      dataRequest: result.dataRequest
        ? new CustomerDataRequestResolver(result.dataRequest.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
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
  return safeDecodeId(globalId, GlobalIdEntity.Customer);
}

function safeDecodeId(
  globalId: string,
  entity: GlobalIdEntity
): string | null {
  try {
    return decodeGlobalIdByType(globalId, entity);
  } catch {
    return null;
  }
}

function invalidIdError(field: string[]) {
  return {
    message: "Invalid ID format",
    field,
    code: "INVALID_ID",
  };
}

function invalidCreatePayload(field: string, idField: string[]) {
  return {
    [field]: null,
    userErrors: [invalidIdError(idField)],
  };
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
