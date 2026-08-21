import { Injectable } from "@nestjs/common";
import type { Media } from "@shopana/broker-types";
import type { CustomerUpdatedReason } from "@shopana/events";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import type { CustomerPatch } from "../repositories/customer/CustomerRepository.js";
import {
  CustomerAddressesUpdateScript,
  CustomerConsentsUpdateScript,
  CustomerGroupsUpdateScript,
  CustomerPatchScript,
  validateCustomerPatch,
  CustomerSegmentsUpdateScript,
  CustomerTagsUpdateScript,
  CustomerTaxExemptionsUpdateScript,
  CustomerTaxIdentifiersUpdateScript,
  type CustomerSectionResult,
} from "../scripts/index.js";
import type {
  CustomerUpdateOperation,
  CustomerUpdateOperationResult,
  CustomerUpdateWorkflowContext,
  CustomerUpdateWorkflowInput,
  CustomerUpdateWorkflowResult,
} from "./dto/index.js";

@Injectable()
export class CustomerUpdateWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("customerUpdate")
  @Policy<CustomerUpdateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: CustomerUpdateWorkflowInput): Promise<CustomerUpdateWorkflowResult> {
    const validationResults = await this.stepValidateOperations(input);
    if (validationResults.some((result) => result.errors.length > 0)) {
      const rejectedResults = validationResults.map((result) => ({
        ...result,
        applied: false,
      }));
      return {
        customer: null,
        operationResults: rejectedResults,
        userErrors: rejectedResults.flatMap((result) => result.errors),
      };
    }
    const acquired = await this.stepAcquireRevision(input.customerId);
    if ("error" in acquired) {
      return {
        customer: null,
        operationResults: [],
        userErrors: [acquired.error],
      };
    }

    const scriptContext = toScriptContext(input.context);
    const operationResults: CustomerUpdateOperationResult[] = [];
    const reasons = new Set<CustomerUpdatedReason>();

    for (const operation of input.operations) {
      const result = await this.runOperation(
        input.customerId,
        input.context.requestId,
        operation,
        scriptContext,
      );
      const errors = prefixErrors(result.userErrors, operation);
      operationResults.push({
        type: operation.type,
        applied: errors.length === 0,
        errors,
      });
      if (result.changed) reasons.add(reasonForOperation(operation));
    }

    const updatedReasons = sortReasons(reasons);
    if (updatedReasons.length > 0) {
      await this.workflowEmitEvent(input, updatedReasons);
    }

    const userErrors = operationResults.flatMap((result) => result.errors);
    if (userErrors.length > 0 && reasons.size === 0) {
      await this.stepReleaseRevision(input.customerId, acquired.revision);
    }
    return {
      customer:
        userErrors.length === 0 ? { id: input.customerId, revision: acquired.revision } : null,
      operationResults,
      userErrors,
    };
  }

  @WorkflowStep()
  private async stepValidateOperations(
    input: CustomerUpdateWorkflowInput,
  ): Promise<CustomerUpdateOperationResult[]> {
    const results: CustomerUpdateOperationResult[] = [];
    for (const operation of input.operations) {
      let errors: CustomerSectionResult["userErrors"] = [];
      if (
        operation.type === "profileUpdate" ||
        operation.type === "contactUpdate" ||
        operation.type === "companyUpdate" ||
        operation.type === "noteUpdate" ||
        operation.type === "moderationUpdate"
      ) {
        errors = validateCustomerPatch(operation.params);
        if (operation.type === "contactUpdate" && operation.params.email) {
          const owner = await this.kernel.repository.customer.findByEmail(operation.params.email);
          if (owner && owner.id !== input.customerId) {
            errors.push({
              message: "A customer with this email already exists",
              code: "DUPLICATE_EMAIL",
              field: ["email"],
            });
          }
        }
      } else if (operation.type === "statusUpdate") {
        errors = validateCustomerPatch(statusPatch(operation.params));
      } else if (operation.type === "taxExemptionUpdate") {
        errors = await this.validateCertificateFiles(operation, input.context.storeId);
      }
      const prefixed = prefixErrors(errors, operation);
      results.push({
        type: operation.type,
        applied: prefixed.length === 0,
        errors: prefixed,
      });
    }
    return results;
  }

  private async validateCertificateFiles(
    operation: Extract<CustomerUpdateOperation, { type: "taxExemptionUpdate" }>,
    storeId: string,
  ): Promise<CustomerSectionResult["userErrors"]> {
    const errors: CustomerSectionResult["userErrors"] = [];
    for (const reference of certificateReferences(operation.params)) {
      const result = await this.broker.call<
        Media.ValidateOwnedFileResult,
        Media.ValidateOwnedFileParams
      >("media.validateOwnedFile", {
        fileId: reference.fileId,
        owner: { type: "store", id: storeId },
      });
      if (!result.valid) {
        errors.push({
          message: "Certificate file was not found",
          code: "FILE_NOT_FOUND",
          field: reference.field,
        });
      }
    }
    return errors;
  }

  @WorkflowStep()
  private async stepAcquireRevision(customerId: string): Promise<
    { revision: number } | { error: { message: string; code: string; field?: string[] } }
  > {
    const customer = await this.kernel.repository.customer.update(customerId, {});
    if (customer) return { revision: customer.revision };

    return {
      error: {
        message: "Customer not found",
        code: "NOT_FOUND",
        field: ["customerId"],
      },
    };
  }

  @WorkflowStep()
  private stepReleaseRevision(customerId: string, revision: number) {
    return this.kernel.repository.customer.releaseRevision(customerId, revision);
  }

  private runOperation(
    customerId: string,
    requestId: string,
    operation: CustomerUpdateOperation,
    context: RunScriptContext,
  ): Promise<CustomerSectionResult> {
    switch (operation.type) {
      case "profileUpdate":
      case "contactUpdate":
      case "companyUpdate":
      case "noteUpdate":
      case "moderationUpdate":
        return this.stepCustomerPatch(customerId, operation.params, context);
      case "statusUpdate":
        return this.stepCustomerPatch(customerId, statusPatch(operation.params), context);
      case "addressUpdate":
        return this.stepAddressesUpdate(customerId, operation.params, context);
      case "consentUpdate":
        return this.stepConsentsUpdate(customerId, requestId, operation.params, context);
      case "taxIdentifierUpdate":
        return this.stepTaxIdentifiersUpdate(customerId, operation.params, context);
      case "taxExemptionUpdate":
        return this.stepTaxExemptionsUpdate(customerId, operation.params, context);
      case "groupUpdate":
        return this.stepGroupsUpdate(customerId, operation.params, context);
      case "tagUpdate":
        return this.stepTagsUpdate(customerId, operation.params, context);
      case "segmentUpdate":
        return this.stepSegmentsUpdate(customerId, operation.params, context);
    }
  }

  @WorkflowStep()
  private stepCustomerPatch(customerId: string, patch: CustomerPatch, context: RunScriptContext) {
    return this.kernel.runScript(CustomerPatchScript, { customerId, patch }, context);
  }

  @WorkflowStep()
  private stepAddressesUpdate(
    customerId: string,
    operations: Extract<CustomerUpdateOperation, { type: "addressUpdate" }>["params"],
    context: RunScriptContext,
  ) {
    return this.kernel.runScript(
      CustomerAddressesUpdateScript,
      { customerId, operations },
      context,
    );
  }

  @WorkflowStep()
  private stepConsentsUpdate(
    customerId: string,
    requestId: string,
    operations: Extract<CustomerUpdateOperation, { type: "consentUpdate" }>["params"],
    context: RunScriptContext,
  ) {
    return this.kernel.runScript(
      CustomerConsentsUpdateScript,
      { customerId, operations, requestId },
      context,
    );
  }

  @WorkflowStep()
  private stepTaxIdentifiersUpdate(
    customerId: string,
    operations: Extract<CustomerUpdateOperation, { type: "taxIdentifierUpdate" }>["params"],
    context: RunScriptContext,
  ) {
    return this.kernel.runScript(
      CustomerTaxIdentifiersUpdateScript,
      { customerId, operations },
      context,
    );
  }

  @WorkflowStep()
  private stepTaxExemptionsUpdate(
    customerId: string,
    operations: Extract<CustomerUpdateOperation, { type: "taxExemptionUpdate" }>["params"],
    context: RunScriptContext,
  ) {
    return this.kernel.runScript(
      CustomerTaxExemptionsUpdateScript,
      { customerId, operations },
      context,
    );
  }

  @WorkflowStep()
  private stepGroupsUpdate(
    customerId: string,
    operations: Extract<CustomerUpdateOperation, { type: "groupUpdate" }>["params"],
    context: RunScriptContext,
  ) {
    return this.kernel.runScript(CustomerGroupsUpdateScript, { customerId, operations }, context);
  }

  @WorkflowStep()
  private stepTagsUpdate(
    customerId: string,
    operations: Extract<CustomerUpdateOperation, { type: "tagUpdate" }>["params"],
    context: RunScriptContext,
  ) {
    return this.kernel.runScript(CustomerTagsUpdateScript, { customerId, operations }, context);
  }

  @WorkflowStep()
  private stepSegmentsUpdate(
    customerId: string,
    operations: Extract<CustomerUpdateOperation, { type: "segmentUpdate" }>["params"],
    context: RunScriptContext,
  ) {
    return this.kernel.runScript(CustomerSegmentsUpdateScript, { customerId, operations }, context);
  }

  private async workflowEmitEvent(
    input: CustomerUpdateWorkflowInput,
    reasons: CustomerUpdatedReason[],
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "customerUpdated",
        payload: {
          customerId: input.customerId,
          storeId: input.context.storeId,
          reasons,
        },
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "customer", id: input.customerId },
        actor: input.context.userId ? { type: "user", id: input.context.userId } : undefined,
        emitKey: `customer:${input.customerId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitCustomerUpdated",
        callId: input.customerId,
      },
    );
  }
}

function toScriptContext(context: CustomerUpdateWorkflowContext): RunScriptContext {
  return {
    storeId: context.storeId,
    organizationId: context.organizationId,
    locale: context.locale,
    userId: context.userId,
    requestId: context.requestId,
  };
}

function statusPatch(
  params: Extract<CustomerUpdateOperation, { type: "statusUpdate" }>["params"],
): CustomerPatch {
  return {
    lifecycleStatus: params.status,
    blockedReason: params.status === "BLOCKED" ? params.blockedReason?.trim() || null : null,
  };
}

function certificateReferences(
  operations: Extract<CustomerUpdateOperation, { type: "taxExemptionUpdate" }>["params"],
): Array<{ fileId: string; field: string[] }> {
  return [
    ...operations.create.flatMap((input, index) =>
      input.certificateFileId
        ? [
            {
              fileId: input.certificateFileId,
              field: ["create", String(index), "certificateFileId"],
            },
          ]
        : [],
    ),
    ...operations.update.flatMap((input, index) =>
      input.operations.certificateFileId
        ? [
            {
              fileId: input.operations.certificateFileId,
              field: ["update", String(index), "operations", "certificateFileId"],
            },
          ]
        : [],
    ),
  ];
}

function prefixErrors(
  errors: CustomerSectionResult["userErrors"],
  operation: CustomerUpdateOperation,
) {
  return errors.map((error) => ({
    ...error,
    field: error.field
      ? [...operation.meta.fieldPrefix, ...error.field]
      : operation.meta.fieldPrefix,
  }));
}

function reasonForOperation(operation: CustomerUpdateOperation): CustomerUpdatedReason {
  const reasons: Record<CustomerUpdateOperation["type"], CustomerUpdatedReason> = {
    profileUpdate: "profile",
    contactUpdate: "contact",
    companyUpdate: "company",
    statusUpdate: "status",
    noteUpdate: "note",
    moderationUpdate: "moderation",
    addressUpdate: "address",
    consentUpdate: "consent",
    taxIdentifierUpdate: "taxIdentifier",
    taxExemptionUpdate: "taxExemption",
    groupUpdate: "group",
    tagUpdate: "tag",
    segmentUpdate: "segment",
  };
  return reasons[operation.type];
}

function sortReasons(reasons: ReadonlySet<CustomerUpdatedReason>): CustomerUpdatedReason[] {
  const order: CustomerUpdatedReason[] = [
    "profile",
    "contact",
    "company",
    "status",
    "note",
    "moderation",
    "address",
    "consent",
    "taxIdentifier",
    "taxExemption",
    "group",
    "tag",
    "segment",
  ];
  return order.filter((reason) => reasons.has(reason));
}
