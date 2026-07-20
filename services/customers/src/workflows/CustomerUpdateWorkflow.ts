import { Injectable } from "@nestjs/common";
import type { CustomerUpdatedReason } from "@shopana/events";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
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
  async run(
    input: CustomerUpdateWorkflowInput
  ): Promise<CustomerUpdateWorkflowResult> {
    const acquired = await this.stepAcquireRevision(
      input.customerId,
      input.expectedRevision
    );
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
        scriptContext
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

    return {
      customer: { id: input.customerId, revision: acquired.revision },
      operationResults,
      userErrors: operationResults.flatMap((result) => result.errors),
    };
  }

  @WorkflowStep()
  private async stepAcquireRevision(
    customerId: string,
    expectedRevision?: number
  ): Promise<
    | { revision: number }
    | { error: { message: string; code: string; field?: string[] } }
  > {
    const customer = await this.kernel.repository.customer.update(
      customerId,
      {},
      expectedRevision
    );
    if (customer) return { revision: customer.revision };

    const exists = await this.kernel.repository.customer.exists(customerId);
    return {
      error: exists
        ? {
            message: "Customer was modified by another user",
            code: "REVISION_CONFLICT",
            field: ["expectedRevision"],
          }
        : {
            message: "Customer not found",
            code: "NOT_FOUND",
            field: ["customerId"],
          },
    };
  }

  private runOperation(
    customerId: string,
    requestId: string,
    operation: CustomerUpdateOperation,
    context: RunScriptContext
  ): Promise<CustomerSectionResult> {
    switch (operation.type) {
      case "profileUpdate":
      case "contactUpdate":
      case "companyUpdate":
      case "noteUpdate":
      case "moderationUpdate":
        return this.stepCustomerPatch(
          customerId,
          operation.params,
          context
        );
      case "statusUpdate":
        return this.stepCustomerPatch(
          customerId,
          statusPatch(operation.params),
          context
        );
      case "addressUpdate":
        return this.stepAddressesUpdate(
          customerId,
          operation.params,
          context
        );
      case "consentUpdate":
        return this.stepConsentsUpdate(
          customerId,
          requestId,
          operation.params,
          context
        );
      case "taxIdentifierUpdate":
        return this.stepTaxIdentifiersUpdate(
          customerId,
          operation.params,
          context
        );
      case "taxExemptionUpdate":
        return this.stepTaxExemptionsUpdate(
          customerId,
          operation.params,
          context
        );
      case "groupUpdate":
        return this.stepGroupsUpdate(customerId, operation.params, context);
      case "tagUpdate":
        return this.stepTagsUpdate(customerId, operation.params, context);
      case "segmentUpdate":
        return this.stepSegmentsUpdate(customerId, operation.params, context);
    }
  }

  @WorkflowStep()
  private stepCustomerPatch(
    customerId: string,
    patch: CustomerPatch,
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      CustomerPatchScript,
      { customerId, patch },
      context
    );
  }

  @WorkflowStep()
  private stepAddressesUpdate(
    customerId: string,
    operations: Extract<
      CustomerUpdateOperation,
      { type: "addressUpdate" }
    >["params"],
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      CustomerAddressesUpdateScript,
      { customerId, operations },
      context
    );
  }

  @WorkflowStep()
  private stepConsentsUpdate(
    customerId: string,
    requestId: string,
    operations: Extract<
      CustomerUpdateOperation,
      { type: "consentUpdate" }
    >["params"],
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      CustomerConsentsUpdateScript,
      { customerId, operations, requestId },
      context
    );
  }

  @WorkflowStep()
  private stepTaxIdentifiersUpdate(
    customerId: string,
    operations: Extract<
      CustomerUpdateOperation,
      { type: "taxIdentifierUpdate" }
    >["params"],
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      CustomerTaxIdentifiersUpdateScript,
      { customerId, operations },
      context
    );
  }

  @WorkflowStep()
  private stepTaxExemptionsUpdate(
    customerId: string,
    operations: Extract<
      CustomerUpdateOperation,
      { type: "taxExemptionUpdate" }
    >["params"],
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      CustomerTaxExemptionsUpdateScript,
      { customerId, operations },
      context
    );
  }

  @WorkflowStep()
  private stepGroupsUpdate(
    customerId: string,
    operations: Extract<
      CustomerUpdateOperation,
      { type: "groupUpdate" }
    >["params"],
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      CustomerGroupsUpdateScript,
      { customerId, operations },
      context
    );
  }

  @WorkflowStep()
  private stepTagsUpdate(
    customerId: string,
    operations: Extract<
      CustomerUpdateOperation,
      { type: "tagUpdate" }
    >["params"],
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      CustomerTagsUpdateScript,
      { customerId, operations },
      context
    );
  }

  @WorkflowStep()
  private stepSegmentsUpdate(
    customerId: string,
    operations: Extract<
      CustomerUpdateOperation,
      { type: "segmentUpdate" }
    >["params"],
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      CustomerSegmentsUpdateScript,
      { customerId, operations },
      context
    );
  }

  private async workflowEmitEvent(
    input: CustomerUpdateWorkflowInput,
    reasons: CustomerUpdatedReason[]
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
        actor: input.context.userId
          ? { type: "user", id: input.context.userId }
          : undefined,
        emitKey: `customer:${input.customerId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitCustomerUpdated",
        callId: input.customerId,
      }
    );
  }
}

function toScriptContext(
  context: CustomerUpdateWorkflowContext
): RunScriptContext {
  return {
    storeId: context.storeId,
    organizationId: context.organizationId,
    locale: context.locale,
    userId: context.userId,
    requestId: context.requestId,
  };
}

function statusPatch(
  params: Extract<
    CustomerUpdateOperation,
    { type: "statusUpdate" }
  >["params"]
): CustomerPatch {
  return {
    lifecycleStatus: params.status,
    blockedReason:
      params.status === "BLOCKED" ? params.blockedReason?.trim() || null : null,
  };
}

function prefixErrors(
  errors: CustomerSectionResult["userErrors"],
  operation: CustomerUpdateOperation
) {
  return errors.map((error) => ({
    ...error,
    field: error.field
      ? [...operation.meta.fieldPrefix, ...error.field]
      : operation.meta.fieldPrefix,
  }));
}

function reasonForOperation(
  operation: CustomerUpdateOperation
): CustomerUpdatedReason {
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

function sortReasons(
  reasons: ReadonlySet<CustomerUpdatedReason>
): CustomerUpdatedReason[] {
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
