import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import type {
  CustomerCreateWorkflowInput,
  CustomerCreateWorkflowResult,
  CustomerDataRequestCreateWorkflowInput,
  CustomerDataRequestCreateWorkflowResult,
  CustomerDataRequestDeleteWorkflowInput,
  CustomerDataRequestDeleteWorkflowResult,
  CustomerDataRequestUpdateWorkflowInput,
  CustomerDataRequestUpdateWorkflowResult,
  CustomerDeleteWorkflowInput,
  CustomerDeleteWorkflowResult,
  CustomerGroupCreateWorkflowInput,
  CustomerGroupCreateWorkflowResult,
  CustomerGroupDeleteWorkflowInput,
  CustomerGroupDeleteWorkflowResult,
  CustomerGroupUpdateWorkflowInput,
  CustomerGroupUpdateWorkflowResult,
  CustomerMergeCreateWorkflowInput,
  CustomerMergeCreateWorkflowResult,
  CustomerMergeDeleteWorkflowInput,
  CustomerMergeDeleteWorkflowResult,
  CustomerMergeUpdateWorkflowInput,
  CustomerMergeUpdateWorkflowResult,
  CustomerMutationWorkflowContext,
  CustomerSegmentCreateWorkflowInput,
  CustomerSegmentCreateWorkflowResult,
  CustomerSegmentDeleteWorkflowInput,
  CustomerSegmentDeleteWorkflowResult,
  CustomerSegmentUpdateWorkflowInput,
  CustomerSegmentUpdateWorkflowResult,
  CustomerTagCreateWorkflowInput,
  CustomerTagCreateWorkflowResult,
  CustomerTagDeleteWorkflowInput,
  CustomerTagDeleteWorkflowResult,
  CustomerTagUpdateWorkflowInput,
  CustomerTagUpdateWorkflowResult,
  CustomerUpdateOperation,
  CustomerUpdateOperationType,
  CustomerUpdateWorkflowInput,
  CustomerUpdateWorkflowResult,
} from "../../workflows/dto/index.js";
import { CustomerDataRequestResolver } from "./CustomerDataRequestResolver.js";
import { CustomerGroupResolver } from "./CustomerGroupResolver.js";
import { CustomerMergeResolver } from "./CustomerMergeResolver.js";
import { CustomerResolver } from "./CustomerResolver.js";
import { CustomerSegmentResolver } from "./CustomerSegmentResolver.js";
import { CustomerTagResolver } from "./CustomerTagResolver.js";
import { CustomersType } from "./CustomersType.js";
import {
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
} from "./generated/schemas.js";
import type {
  CustomersMutationCustomerCreateArgs,
  CustomersMutationCustomerDataRequestCreateArgs,
  CustomersMutationCustomerDataRequestDeleteArgs,
  CustomersMutationCustomerDataRequestUpdateArgs,
  CustomersMutationCustomerDeleteArgs,
  CustomersMutationCustomerGroupCreateArgs,
  CustomersMutationCustomerGroupDeleteArgs,
  CustomersMutationCustomerGroupUpdateArgs,
  CustomersMutationCustomerMergeCreateArgs,
  CustomersMutationCustomerMergeDeleteArgs,
  CustomersMutationCustomerMergeUpdateArgs,
  CustomersMutationCustomerSegmentCreateArgs,
  CustomersMutationCustomerSegmentDeleteArgs,
  CustomersMutationCustomerSegmentUpdateArgs,
  CustomersMutationCustomerTagCreateArgs,
  CustomersMutationCustomerTagDeleteArgs,
  CustomersMutationCustomerTagUpdateArgs,
  CustomersMutationCustomerUpdateArgs,
} from "./generated/types.js";
import { mapCustomerUpdateInput } from "./customerUpdateMapper.js";

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
      expectedRevision: args.expectedRevision,
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

  async customerGroupUpdate(args: CustomersMutationCustomerGroupUpdateArgs) {
    const groupId = safeDecodeId(args.groupId, GlobalIdEntity.CustomerGroup);
    const errors = !groupId ? [invalidIdError(["groupId"])] : [];
    const raw = args.operations ?? {};
    const operations = {} as CustomerGroupUpdateWorkflowInput["params"]["operations"];
    if (raw.definition) {
      operations.definition = pickPresent(raw.definition, [
        "code",
        "name",
        "description",
      ]);
    }
    if (raw.state) {
      operations.state = pickPresent(raw.state, ["isDefault", "isActive"]);
    }
    if (raw.memberships) {
      operations.memberships = {
        create: (raw.memberships.create ?? []).flatMap((input, index) => {
          const customerId = decodeIdForUpdate(
            input.customerId,
            GlobalIdEntity.Customer,
            ["operations", "memberships", "create", String(index), "customerId"],
            errors
          );
          return customerId
            ? [
                {
                  customerId,
                  ...pickPresent(input, ["isPrimary", "expiresAt"]),
                },
              ]
            : [];
        }),
        update: (raw.memberships.update ?? []).flatMap((input, index) => {
          const membershipId = decodeIdForUpdate(
            input.membershipId,
            GlobalIdEntity.CustomerGroupMembership,
            [
              "operations",
              "memberships",
              "update",
              String(index),
              "membershipId",
            ],
            errors
          );
          return membershipId
            ? [
                {
                  membershipId,
                  ...pickPresent(input, ["isPrimary", "expiresAt"]),
                },
              ]
            : [];
        }),
        deleteIds: decodeIdsForUpdate(
          raw.memberships.deleteIds ?? [],
          GlobalIdEntity.CustomerGroupMembership,
          ["operations", "memberships", "deleteIds"],
          errors
        ),
      };
    }
    if (!groupId || errors.length > 0) {
      return invalidUpdatePayload("group", "groupUpdate", errors);
    }

    const workflowInput: CustomerGroupUpdateWorkflowInput = {
      params: {
        id: groupId,
        expectedRevision: args.expectedRevision,
        operations,
      },
      context: this.mutationWorkflowContext(),
    };
    const result =
      await this.runEntityWorkflow<CustomerGroupUpdateWorkflowResult>(
        "customerGroupUpdate",
        workflowInput
      );
    this.$ctx.loaders.group.clear(groupId);
    this.$ctx.loaders.groupCustomersCount.clear(groupId);
    if (operations.memberships) this.$ctx.loaders.groupMembership.clearAll();
    return {
      group: result.group
        ? new CustomerGroupResolver(result.group.id, this.$ctx)
        : null,
      operationResults: mapOperationResults(result.operationResults),
      userErrors: result.userErrors,
    };
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

  async customerTagUpdate(args: CustomersMutationCustomerTagUpdateArgs) {
    const tagId = safeDecodeId(args.tagId, GlobalIdEntity.CustomerTag);
    const errors = !tagId ? [invalidIdError(["tagId"])] : [];
    const raw = args.operations ?? {};
    const operations = pickPresent(raw, [
      "name",
    ]) as CustomerTagUpdateWorkflowInput["params"]["operations"];
    if (raw.assignments) {
      operations.assignments = {
        create: (raw.assignments.create ?? []).flatMap((input, index) => {
          const customerId = decodeIdForUpdate(
            input.customerId,
            GlobalIdEntity.Customer,
            ["operations", "assignments", "create", String(index), "customerId"],
            errors
          );
          return customerId ? [{ customerId }] : [];
        }),
        deleteIds: decodeIdsForUpdate(
          raw.assignments.deleteIds ?? [],
          GlobalIdEntity.CustomerTagAssignment,
          ["operations", "assignments", "deleteIds"],
          errors
        ),
      };
    }
    if (!tagId || errors.length > 0) {
      return invalidUpdatePayload("tag", "tagUpdate", errors);
    }

    const workflowInput: CustomerTagUpdateWorkflowInput = {
      params: { id: tagId, operations },
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runEntityWorkflow<CustomerTagUpdateWorkflowResult>(
      "customerTagUpdate",
      workflowInput
    );
    this.$ctx.loaders.tag.clear(tagId);
    this.$ctx.loaders.tagCustomersCount.clear(tagId);
    if (operations.assignments) this.$ctx.loaders.tagAssignment.clearAll();
    return {
      tag: result.tag
        ? new CustomerTagResolver(result.tag.id, this.$ctx)
        : null,
      operationResults: mapOperationResults(result.operationResults),
      userErrors: result.userErrors,
    };
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

  async customerSegmentUpdate(
    args: CustomersMutationCustomerSegmentUpdateArgs
  ) {
    const segmentId = safeDecodeId(
      args.segmentId,
      GlobalIdEntity.CustomerSegment
    );
    const errors = !segmentId ? [invalidIdError(["segmentId"])] : [];
    const raw = args.operations ?? {};
    const operations = {} as CustomerSegmentUpdateWorkflowInput["params"]["operations"];

    if (raw.details) {
      operations.details = pickPresent(raw.details, [
        "name",
        "description",
        "color",
      ]);
    }
    if (raw.definition) {
      operations.definition = pickPresent(raw.definition, [
        "type",
        "query",
        "definition",
      ]);
      if (
        hasOwn(operations.definition, "definition") &&
        operations.definition.definition !== null &&
        !isRecord(operations.definition.definition)
      ) {
        errors.push({
          message: "Segment definition must be a JSON object",
          code: "INVALID_DEFINITION",
          field: ["operations", "definition", "definition"],
        });
      }
      if (operations.definition.type) {
        operations.definition.type = String(
          operations.definition.type
        ) as NonNullable<typeof operations.definition.type>;
      }
    }
    if (raw.state) {
      operations.state = pickPresent(raw.state, ["status"]);
      if (operations.state.status) {
        operations.state.status = String(
          operations.state.status
        ) as NonNullable<typeof operations.state.status>;
      }
    }
    if (raw.memberships) {
      const memberships: NonNullable<typeof operations.memberships> = {
        create: (raw.memberships.create ?? []).flatMap((input, index) => {
          const customerId = decodeIdForUpdate(
            input.customerId,
            GlobalIdEntity.Customer,
            ["operations", "memberships", "create", String(index), "customerId"],
            errors
          );
          return customerId
            ? [{ customerId, ...pickPresent(input, ["expiresAt"]) }]
            : [];
        }),
        update: (raw.memberships.update ?? []).flatMap((input, index) => {
          const membershipId = decodeIdForUpdate(
            input.membershipId,
            GlobalIdEntity.CustomerSegmentMembership,
            [
              "operations",
              "memberships",
              "update",
              String(index),
              "membershipId",
            ],
            errors
          );
          return membershipId
            ? [{ membershipId, ...pickPresent(input, ["expiresAt"]) }]
            : [];
        }),
        deleteIds: decodeIdsForUpdate(
          raw.memberships.deleteIds ?? [],
          GlobalIdEntity.CustomerSegmentMembership,
          ["operations", "memberships", "deleteIds"],
          errors
        ),
      };
      if (raw.memberships.setCustomerIds != null) {
        memberships.setCustomerIds = decodeIdsForUpdate(
          raw.memberships.setCustomerIds,
          GlobalIdEntity.Customer,
          ["operations", "memberships", "setCustomerIds"],
          errors
        );
      }
      operations.memberships = memberships;
    }
    if (!segmentId || errors.length > 0) {
      return invalidUpdatePayload("segment", "segmentUpdate", errors);
    }

    const workflowInput: CustomerSegmentUpdateWorkflowInput = {
      params: {
        id: segmentId,
        expectedRevision: args.expectedRevision,
        operations,
      },
      context: this.mutationWorkflowContext(),
    };
    const result =
      await this.runEntityWorkflow<CustomerSegmentUpdateWorkflowResult>(
        "customerSegmentUpdate",
        workflowInput
      );
    this.$ctx.loaders.segment.clear(segmentId);
    this.$ctx.loaders.segmentCustomersCount.clear(segmentId);
    if (operations.memberships) this.$ctx.loaders.segmentMembership.clearAll();
    return {
      segment: result.segment
        ? new CustomerSegmentResolver(result.segment.id, this.$ctx)
        : null,
      operationResults: mapOperationResults(result.operationResults),
      userErrors: result.userErrors,
    };
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

  async customerMergeUpdate(args: CustomersMutationCustomerMergeUpdateArgs) {
    const mergeId = safeDecodeId(args.mergeId, GlobalIdEntity.CustomerMerge);
    const errors = !mergeId ? [invalidIdError(["mergeId"])] : [];
    const raw = args.operations ?? {};
    const operations = pickPresent(raw, [
      "sourceCustomerId",
      "targetCustomerId",
      "reason",
    ]) as CustomerMergeUpdateWorkflowInput["params"]["operations"];
    for (const field of ["sourceCustomerId", "targetCustomerId"] as const) {
      const value = operations[field];
      if (!value) continue;
      const customerId = decodeIdForUpdate(
        value,
        GlobalIdEntity.Customer,
        ["operations", field],
        errors
      );
      if (customerId) operations[field] = customerId;
    }
    if (!mergeId || errors.length > 0) {
      return invalidUpdatePayload("merge", "mergeUpdate", errors);
    }

    const workflowInput: CustomerMergeUpdateWorkflowInput = {
      params: { id: mergeId, operations },
      context: this.mutationWorkflowContext(),
    };
    const result =
      await this.runEntityWorkflow<CustomerMergeUpdateWorkflowResult>(
        "customerMergeUpdate",
        workflowInput
      );
    this.$ctx.loaders.customerMerge.clear(mergeId);
    return {
      merge: result.merge
        ? new CustomerMergeResolver(result.merge.id, this.$ctx)
        : null,
      operationResults: mapOperationResults(result.operationResults),
      userErrors: result.userErrors,
    };
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

  async customerDataRequestUpdate(
    args: CustomersMutationCustomerDataRequestUpdateArgs
  ) {
    const dataRequestId = safeDecodeId(
      args.dataRequestId,
      GlobalIdEntity.CustomerDataRequest
    );
    const errors = !dataRequestId
      ? [invalidIdError(["dataRequestId"])]
      : [];
    const raw = args.operations ?? {};
    const operations = pickPresent(raw, [
      "customerId",
      "type",
      "legalBasis",
      "requestMetadata",
      "dueAt",
      "cancel",
    ]) as CustomerDataRequestUpdateWorkflowInput["params"]["operations"];
    if (operations.customerId) {
      const customerId = decodeIdForUpdate(
        operations.customerId,
        GlobalIdEntity.Customer,
        ["operations", "customerId"],
        errors
      );
      if (customerId) operations.customerId = customerId;
    }
    if (
      hasOwn(operations, "requestMetadata") &&
      operations.requestMetadata !== null &&
      !isRecord(operations.requestMetadata)
    ) {
      errors.push({
        message: "Request metadata must be a JSON object",
        code: "INVALID_REQUEST_METADATA",
        field: ["operations", "requestMetadata"],
      });
    }
    if (operations.type) {
      operations.type = String(
        operations.type
      ) as NonNullable<typeof operations.type>;
    }
    if (!dataRequestId || errors.length > 0) {
      return invalidUpdatePayload(
        "dataRequest",
        "dataRequestUpdate",
        errors
      );
    }

    const workflowInput: CustomerDataRequestUpdateWorkflowInput = {
      params: { id: dataRequestId, operations },
      context: this.mutationWorkflowContext(),
    };
    const result =
      await this.runEntityWorkflow<CustomerDataRequestUpdateWorkflowResult>(
        "customerDataRequestUpdate",
        workflowInput
      );
    this.$ctx.loaders.customerDataRequest.clear(dataRequestId);
    return {
      dataRequest: result.dataRequest
        ? new CustomerDataRequestResolver(result.dataRequest.id, this.$ctx)
        : null,
      operationResults: mapOperationResults(result.operationResults),
      userErrors: result.userErrors,
    };
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

function invalidUpdatePayload(
  field: string,
  type: CustomerUpdateOperationType,
  errors: Array<{ message: string; code: string; field?: string[] }>
) {
  return {
    [field]: null,
    operationResults: [
      {
        type: toGraphqlOperationType(type),
        applied: false,
        errors,
      },
    ],
    userErrors: errors,
  };
}

function invalidConsentUpdatePayload(
  errors: Array<{ message: string; code: string; field?: string[] }>
) {
  return {
    consent: null,
    event: null,
    operationResults: [
      {
        type: toGraphqlOperationType("consentUpdate"),
        applied: false,
        errors,
      },
    ],
    userErrors: errors,
  };
}

function mapOperationResults(
  results: Array<{
    type: CustomerUpdateOperationType;
    applied: boolean;
    errors: Array<{ message: string; code?: string; field?: string[] }>;
  }>
) {
  return results.map((result) => ({
    type: toGraphqlOperationType(result.type),
    applied: result.applied,
    errors: result.errors,
  }));
}

function decodeIdForUpdate(
  globalId: string,
  entity: GlobalIdEntity,
  field: string[],
  errors: Array<{ message: string; code: string; field: string[] }>
): string | null {
  const id = safeDecodeId(globalId, entity);
  if (!id) errors.push(invalidIdError(field));
  return id;
}

function decodeIdsForUpdate(
  globalIds: readonly string[],
  entity: GlobalIdEntity,
  field: string[],
  errors: Array<{ message: string; code: string; field: string[] }>
): string[] {
  return globalIds.flatMap((globalId, index) => {
    const id = decodeIdForUpdate(
      globalId,
      entity,
      [...field, String(index)],
      errors
    );
    return id ? [id] : [];
  });
}

function pickPresent(
  input: object,
  fields: readonly string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (hasOwn(input, field)) {
      result[field] = (input as Record<string, unknown>)[field];
    }
  }
  return result;
}

function hasOwn(value: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toGraphqlOperationType(type: CustomerUpdateOperationType) {
  const types: Record<CustomerUpdateOperationType, string> = {
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
    mergeUpdate: "MERGE_UPDATE",
    dataRequestUpdate: "DATA_REQUEST_UPDATE",
  };
  return types[type];
}
