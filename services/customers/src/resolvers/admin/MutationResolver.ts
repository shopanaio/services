import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import type {
  CustomerAddressCreateWorkflowInput,
  CustomerAddressCreateWorkflowResult,
  CustomerAddressDeleteWorkflowInput,
  CustomerAddressDeleteWorkflowResult,
  CustomerConsentCreateWorkflowInput,
  CustomerConsentCreateWorkflowResult,
  CustomerConsentDeleteWorkflowInput,
  CustomerConsentDeleteWorkflowResult,
  CustomerCreateWorkflowInput,
  CustomerCreateWorkflowResult,
  CustomerDataRequestCreateWorkflowInput,
  CustomerDataRequestCreateWorkflowResult,
  CustomerDataRequestDeleteWorkflowInput,
  CustomerDataRequestDeleteWorkflowResult,
  CustomerDeleteWorkflowInput,
  CustomerDeleteWorkflowResult,
  CustomerGroupCreateWorkflowInput,
  CustomerGroupCreateWorkflowResult,
  CustomerGroupDeleteWorkflowInput,
  CustomerGroupDeleteWorkflowResult,
  CustomerMergeCreateWorkflowInput,
  CustomerMergeCreateWorkflowResult,
  CustomerMergeDeleteWorkflowInput,
  CustomerMergeDeleteWorkflowResult,
  CustomerMutationWorkflowContext,
  CustomerSegmentCreateWorkflowInput,
  CustomerSegmentCreateWorkflowResult,
  CustomerSegmentDeleteWorkflowInput,
  CustomerSegmentDeleteWorkflowResult,
  CustomerTagCreateWorkflowInput,
  CustomerTagCreateWorkflowResult,
  CustomerTagDeleteWorkflowInput,
  CustomerTagDeleteWorkflowResult,
  CustomerTaxExemptionCreateWorkflowInput,
  CustomerTaxExemptionCreateWorkflowResult,
  CustomerTaxExemptionDeleteWorkflowInput,
  CustomerTaxExemptionDeleteWorkflowResult,
  CustomerTaxIdentifierCreateWorkflowInput,
  CustomerTaxIdentifierCreateWorkflowResult,
  CustomerTaxIdentifierDeleteWorkflowInput,
  CustomerTaxIdentifierDeleteWorkflowResult,
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
  CustomerAddressDeleteInputSchema,
  CustomerConsentCreateInputSchema,
  CustomerConsentDeleteInputSchema,
  CustomerCreateInputSchema,
  CustomerDataRequestCreateInputSchema,
  CustomerDataRequestDeleteInputSchema,
  CustomerDeleteInputSchema,
  CustomerGroupCreateInputSchema,
  CustomerGroupDeleteInputSchema,
  CustomerMergeCreateInputSchema,
  CustomerMergeDeleteInputSchema,
  CustomerSegmentCreateInputSchema,
  CustomerSegmentDeleteInputSchema,
  CustomerTagCreateInputSchema,
  CustomerTagDeleteInputSchema,
  CustomerTaxExemptionCreateInputSchema,
  CustomerTaxExemptionDeleteInputSchema,
  CustomerTaxIdentifierCreateInputSchema,
  CustomerTaxIdentifierDeleteInputSchema,
} from "./generated/schemas.js";
import type {
  CustomersMutationCustomerAddressCreateArgs,
  CustomersMutationCustomerAddressDeleteArgs,
  CustomersMutationCustomerConsentCreateArgs,
  CustomersMutationCustomerConsentDeleteArgs,
  CustomersMutationCustomerCreateArgs,
  CustomersMutationCustomerDataRequestCreateArgs,
  CustomersMutationCustomerDataRequestDeleteArgs,
  CustomersMutationCustomerDeleteArgs,
  CustomersMutationCustomerGroupCreateArgs,
  CustomersMutationCustomerGroupDeleteArgs,
  CustomersMutationCustomerMergeCreateArgs,
  CustomersMutationCustomerMergeDeleteArgs,
  CustomersMutationCustomerSegmentCreateArgs,
  CustomersMutationCustomerSegmentDeleteArgs,
  CustomersMutationCustomerTagCreateArgs,
  CustomersMutationCustomerTagDeleteArgs,
  CustomersMutationCustomerTaxExemptionCreateArgs,
  CustomersMutationCustomerTaxExemptionDeleteArgs,
  CustomersMutationCustomerTaxIdentifierCreateArgs,
  CustomersMutationCustomerTaxIdentifierDeleteArgs,
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

  private async runEntityWorkflow<TResult>(
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
    const result = await this.runEntityWorkflow<CustomerAddressCreateWorkflowResult>(
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

  @ZodResolver(CustomerAddressDeleteInputSchema())
  async customerAddressDelete(
    args: CustomersMutationCustomerAddressDeleteArgs
  ) {
    const addressId = safeDecodeId(
      args.input.id,
      GlobalIdEntity.CustomerAddress
    );
    if (!addressId) {
      return invalidDeletePayload("deletedAddressId");
    }

    const workflowInput: CustomerAddressDeleteWorkflowInput = {
      params: { id: addressId },
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runEntityWorkflow<CustomerAddressDeleteWorkflowResult>(
      "customerAddressDelete",
      workflowInput
    );
    if (result.deletedAddressId) {
      this.$ctx.loaders.address.clear(addressId);
      if (result.customerId) {
        this.$ctx.loaders.addressesByCustomer.clear(result.customerId);
      }
    }
    return {
      deletedAddressId: result.deletedAddressId
        ? encodeGlobalIdByType(
            result.deletedAddressId,
            GlobalIdEntity.CustomerAddress
          )
        : null,
      userErrors: result.userErrors,
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
      await this.runEntityWorkflow<CustomerTaxIdentifierCreateWorkflowResult>(
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

  @ZodResolver(CustomerTaxIdentifierDeleteInputSchema())
  async customerTaxIdentifierDelete(
    args: CustomersMutationCustomerTaxIdentifierDeleteArgs
  ) {
    const taxIdentifierId = safeDecodeId(
      args.input.id,
      GlobalIdEntity.CustomerTaxIdentifier
    );
    if (!taxIdentifierId) {
      return invalidDeletePayload("deletedTaxIdentifierId");
    }

    const workflowInput: CustomerTaxIdentifierDeleteWorkflowInput = {
      params: { id: taxIdentifierId },
      context: this.mutationWorkflowContext(),
    };
    const result =
      await this.runEntityWorkflow<CustomerTaxIdentifierDeleteWorkflowResult>(
        "customerTaxIdentifierDelete",
        workflowInput
      );
    if (result.deletedTaxIdentifierId) {
      this.$ctx.loaders.taxIdentifier.clear(taxIdentifierId);
    }
    return {
      deletedTaxIdentifierId: result.deletedTaxIdentifierId
        ? encodeGlobalIdByType(
            result.deletedTaxIdentifierId,
            GlobalIdEntity.CustomerTaxIdentifier
          )
        : null,
      userErrors: result.userErrors,
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
      await this.runEntityWorkflow<CustomerTaxExemptionCreateWorkflowResult>(
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

  @ZodResolver(CustomerTaxExemptionDeleteInputSchema())
  async customerTaxExemptionDelete(
    args: CustomersMutationCustomerTaxExemptionDeleteArgs
  ) {
    const taxExemptionId = safeDecodeId(
      args.input.id,
      GlobalIdEntity.CustomerTaxExemption
    );
    if (!taxExemptionId) {
      return invalidDeletePayload("deletedTaxExemptionId");
    }

    const workflowInput: CustomerTaxExemptionDeleteWorkflowInput = {
      params: { id: taxExemptionId },
      context: this.mutationWorkflowContext(),
    };
    const result =
      await this.runEntityWorkflow<CustomerTaxExemptionDeleteWorkflowResult>(
        "customerTaxExemptionDelete",
        workflowInput
      );
    if (result.deletedTaxExemptionId) {
      this.$ctx.loaders.taxExemption.clear(taxExemptionId);
    }
    return {
      deletedTaxExemptionId: result.deletedTaxExemptionId
        ? encodeGlobalIdByType(
            result.deletedTaxExemptionId,
            GlobalIdEntity.CustomerTaxExemption
          )
        : null,
      userErrors: result.userErrors,
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
      await this.runEntityWorkflow<CustomerConsentCreateWorkflowResult>(
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

  @ZodResolver(CustomerConsentDeleteInputSchema())
  async customerConsentDelete(
    args: CustomersMutationCustomerConsentDeleteArgs
  ) {
    const consentId = safeDecodeId(
      args.input.id,
      GlobalIdEntity.CustomerConsent
    );
    if (!consentId) {
      return invalidDeletePayload("deletedConsentId");
    }

    const workflowInput: CustomerConsentDeleteWorkflowInput = {
      params: { id: consentId },
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runEntityWorkflow<CustomerConsentDeleteWorkflowResult>(
      "customerConsentDelete",
      workflowInput
    );
    if (result.deletedConsentId) {
      this.$ctx.loaders.consent.clear(consentId);
      if (result.customerId) {
        this.$ctx.loaders.consentsByCustomer.clear(result.customerId);
      }
    }
    return {
      deletedConsentId: result.deletedConsentId
        ? encodeGlobalIdByType(
            result.deletedConsentId,
            GlobalIdEntity.CustomerConsent
          )
        : null,
      userErrors: result.userErrors,
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
    const result = await this.runEntityWorkflow<CustomerGroupCreateWorkflowResult>(
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

  @ZodResolver(CustomerGroupDeleteInputSchema())
  async customerGroupDelete(args: CustomersMutationCustomerGroupDeleteArgs) {
    const groupId = safeDecodeId(args.input.id, GlobalIdEntity.CustomerGroup);
    if (!groupId) {
      return invalidDeletePayload("deletedGroupId");
    }

    const workflowInput: CustomerGroupDeleteWorkflowInput = {
      params: { id: groupId },
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runEntityWorkflow<CustomerGroupDeleteWorkflowResult>(
      "customerGroupDelete",
      workflowInput
    );
    if (result.deletedGroupId) {
      this.$ctx.loaders.group.clear(groupId);
      this.$ctx.loaders.groupCustomersCount.clear(groupId);
    }
    return {
      deletedGroupId: result.deletedGroupId
        ? encodeGlobalIdByType(result.deletedGroupId, GlobalIdEntity.CustomerGroup)
        : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(CustomerTagCreateInputSchema())
  async customerTagCreate(args: CustomersMutationCustomerTagCreateArgs) {
    const workflowInput: CustomerTagCreateWorkflowInput = {
      params: args.input,
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runEntityWorkflow<CustomerTagCreateWorkflowResult>(
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

  @ZodResolver(CustomerTagDeleteInputSchema())
  async customerTagDelete(args: CustomersMutationCustomerTagDeleteArgs) {
    const tagId = safeDecodeId(args.input.id, GlobalIdEntity.CustomerTag);
    if (!tagId) {
      return invalidDeletePayload("deletedTagId");
    }

    const workflowInput: CustomerTagDeleteWorkflowInput = {
      params: { id: tagId },
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runEntityWorkflow<CustomerTagDeleteWorkflowResult>(
      "customerTagDelete",
      workflowInput
    );
    if (result.deletedTagId) {
      this.$ctx.loaders.tag.clear(tagId);
      this.$ctx.loaders.tagCustomersCount.clear(tagId);
    }
    return {
      deletedTagId: result.deletedTagId
        ? encodeGlobalIdByType(result.deletedTagId, GlobalIdEntity.CustomerTag)
        : null,
      userErrors: result.userErrors,
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
      await this.runEntityWorkflow<CustomerSegmentCreateWorkflowResult>(
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

  @ZodResolver(CustomerSegmentDeleteInputSchema())
  async customerSegmentDelete(
    args: CustomersMutationCustomerSegmentDeleteArgs
  ) {
    const segmentId = safeDecodeId(
      args.input.id,
      GlobalIdEntity.CustomerSegment
    );
    if (!segmentId) {
      return invalidDeletePayload("deletedSegmentId");
    }

    const workflowInput: CustomerSegmentDeleteWorkflowInput = {
      params: {
        id: segmentId,
        expectedRevision: args.input.expectedRevision ?? undefined,
      },
      context: this.mutationWorkflowContext(),
    };
    const result =
      await this.runEntityWorkflow<CustomerSegmentDeleteWorkflowResult>(
        "customerSegmentDelete",
        workflowInput
      );
    if (result.deletedSegmentId) {
      this.$ctx.loaders.segment.clear(segmentId);
      this.$ctx.loaders.segmentCustomersCount.clear(segmentId);
    }
    return {
      deletedSegmentId: result.deletedSegmentId
        ? encodeGlobalIdByType(
            result.deletedSegmentId,
            GlobalIdEntity.CustomerSegment
          )
        : null,
      userErrors: result.userErrors,
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
    const result = await this.runEntityWorkflow<CustomerMergeCreateWorkflowResult>(
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

  @ZodResolver(CustomerMergeDeleteInputSchema())
  async customerMergeDelete(args: CustomersMutationCustomerMergeDeleteArgs) {
    const mergeId = safeDecodeId(args.input.id, GlobalIdEntity.CustomerMerge);
    if (!mergeId) {
      return invalidDeletePayload("deletedMergeId");
    }

    const workflowInput: CustomerMergeDeleteWorkflowInput = {
      params: { id: mergeId },
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runEntityWorkflow<CustomerMergeDeleteWorkflowResult>(
      "customerMergeDelete",
      workflowInput
    );
    if (result.deletedMergeId) {
      this.$ctx.loaders.customerMerge.clear(mergeId);
    }
    return {
      deletedMergeId: result.deletedMergeId
        ? encodeGlobalIdByType(result.deletedMergeId, GlobalIdEntity.CustomerMerge)
        : null,
      userErrors: result.userErrors,
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
      await this.runEntityWorkflow<CustomerDataRequestCreateWorkflowResult>(
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

  @ZodResolver(CustomerDataRequestDeleteInputSchema())
  async customerDataRequestDelete(
    args: CustomersMutationCustomerDataRequestDeleteArgs
  ) {
    const dataRequestId = safeDecodeId(
      args.input.id,
      GlobalIdEntity.CustomerDataRequest
    );
    if (!dataRequestId) {
      return invalidDeletePayload("deletedDataRequestId");
    }

    const workflowInput: CustomerDataRequestDeleteWorkflowInput = {
      params: { id: dataRequestId },
      context: this.mutationWorkflowContext(),
    };
    const result =
      await this.runEntityWorkflow<CustomerDataRequestDeleteWorkflowResult>(
        "customerDataRequestDelete",
        workflowInput
      );
    if (result.deletedDataRequestId) {
      this.$ctx.loaders.customerDataRequest.clear(dataRequestId);
    }
    return {
      deletedDataRequestId: result.deletedDataRequestId
        ? encodeGlobalIdByType(
            result.deletedDataRequestId,
            GlobalIdEntity.CustomerDataRequest
          )
        : null,
      userErrors: result.userErrors,
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

function invalidDeletePayload(field: string) {
  return {
    [field]: null,
    userErrors: [invalidIdError(["input", "id"])],
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
