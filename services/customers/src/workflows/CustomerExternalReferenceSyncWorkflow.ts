import { Injectable } from "@nestjs/common";
import type {
  CustomerExternalReferenceSnapshot,
  CustomerExternalReferenceSyncOperation,
  CustomerExternalReferenceSyncOperationResult,
} from "@shopana/broker-types";
import type {
  CustomerExternalReferenceCreatedEvent,
  CustomerExternalReferenceDeletedEvent,
  CustomerExternalReferenceReassignedEvent,
} from "@shopana/events";
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
import type { CustomerExternalReference } from "../repositories/models/index.js";
import {
  CustomerExternalReferenceDeleteScript,
  CustomerExternalReferenceUpsertScript,
} from "../scripts/index.js";
import type {
  CustomerExternalReferenceSyncWorkflowInput,
  CustomerExternalReferenceSyncWorkflowResult,
  CustomerExternalReferenceWorkflowContext,
} from "./dto/index.js";

@Injectable()
export class CustomerExternalReferenceSyncWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("customerExternalReferenceSync")
  async run(
    input: CustomerExternalReferenceSyncWorkflowInput,
  ): Promise<CustomerExternalReferenceSyncWorkflowResult> {
    const results: CustomerExternalReferenceSyncOperationResult[] = [];

    for (const [index, operation] of input.operations.entries()) {
      const result = await this.runOperation(input, operation, index);
      results.push(result);
    }

    const appliedCount = results.filter((result) => result.applied).length;
    return {
      results,
      appliedCount,
      failedCount: results.length - appliedCount,
    };
  }

  private async runOperation(
    input: CustomerExternalReferenceSyncWorkflowInput,
    operation: CustomerExternalReferenceSyncOperation,
    index: number,
  ): Promise<CustomerExternalReferenceSyncOperationResult> {
    if (operation.type === "UPSERT") {
      const result = await this.stepUpsert(input, operation);
      if (!result.externalReference || !result.outcome) {
        return {
          index,
          type: operation.type,
          applied: false,
          userErrors: result.userErrors,
        };
      }

      if (result.outcome === "CREATED") {
        await this.emitCreated(input.context, result.externalReference, index);
      } else if (result.outcome === "REASSIGNED" && result.previousCustomerId) {
        await this.emitReassigned(
          input.context,
          result.externalReference,
          result.previousCustomerId,
          index,
        );
      }

      return {
        index,
        type: operation.type,
        applied: true,
        reference: toSnapshot(result.externalReference),
        outcome: result.outcome,
        previousCustomerId: result.previousCustomerId,
        userErrors: [],
      };
    }

    const result = await this.stepDelete(input, operation);
    if (result.userErrors.length > 0) {
      return {
        index,
        type: operation.type,
        applied: false,
        userErrors: result.userErrors,
      };
    }
    if (!result.deletedExternalReference) {
      return {
        index,
        type: operation.type,
        applied: true,
        userErrors: [],
      };
    }

    await this.emitDeleted(input.context, result.deletedExternalReference, index);
    return {
      index,
      type: operation.type,
      applied: true,
      deletedReferenceId: result.deletedExternalReference.id,
      customerId: result.deletedExternalReference.customerId,
      userErrors: [],
    };
  }

  @WorkflowStep()
  private stepUpsert(
    input: CustomerExternalReferenceSyncWorkflowInput,
    operation: Extract<CustomerExternalReferenceSyncOperation, { type: "UPSERT" }>,
  ) {
    return this.kernel.runScript(
      CustomerExternalReferenceUpsertScript,
      {
        customerId: operation.customerId,
        externalSystem: input.context.appCode,
        externalType: operation.externalType,
        externalId: operation.externalId,
        metadata: operation.metadata,
        conflictPolicy: operation.conflictPolicy,
      },
      toScriptContext(input.context),
    );
  }

  @WorkflowStep()
  private stepDelete(
    input: CustomerExternalReferenceSyncWorkflowInput,
    operation: Extract<CustomerExternalReferenceSyncOperation, { type: "DELETE" }>,
  ) {
    return this.kernel.runScript(
      CustomerExternalReferenceDeleteScript,
      {
        externalSystem: input.context.appCode,
        externalType: operation.externalType,
        externalId: operation.externalId,
        ignoreMissing: true,
      },
      toScriptContext(input.context),
    );
  }

  private emitCreated(
    context: CustomerExternalReferenceWorkflowContext,
    reference: CustomerExternalReference,
    operationIndex: number,
  ): Promise<unknown> {
    const payload: CustomerExternalReferenceCreatedEvent["payload"] = {
      externalReferenceId: reference.id,
      storeId: context.storeId,
      customerId: reference.customerId,
      externalSystem: reference.externalSystem,
      externalType: reference.externalType,
      externalId: reference.externalId,
    };
    return this.emitEvent(
      context,
      "customerExternalReferenceCreated",
      payload,
      reference.id,
      "emitCustomerExternalReferenceCreated",
      operationIndex,
    );
  }

  private emitReassigned(
    context: CustomerExternalReferenceWorkflowContext,
    reference: CustomerExternalReference,
    previousCustomerId: string,
    operationIndex: number,
  ): Promise<unknown> {
    const payload: CustomerExternalReferenceReassignedEvent["payload"] = {
      externalReferenceId: reference.id,
      storeId: context.storeId,
      previousCustomerId,
      customerId: reference.customerId,
      externalSystem: reference.externalSystem,
      externalType: reference.externalType,
      externalId: reference.externalId,
    };
    return this.emitEvent(
      context,
      "customerExternalReferenceReassigned",
      payload,
      reference.id,
      "emitCustomerExternalReferenceReassigned",
      operationIndex,
    );
  }

  private emitDeleted(
    context: CustomerExternalReferenceWorkflowContext,
    reference: CustomerExternalReference,
    operationIndex: number,
  ): Promise<unknown> {
    const payload: CustomerExternalReferenceDeletedEvent["payload"] = {
      externalReferenceId: reference.id,
      storeId: context.storeId,
      customerId: reference.customerId,
      externalSystem: reference.externalSystem,
      externalType: reference.externalType,
      externalId: reference.externalId,
    };
    return this.emitEvent(
      context,
      "customerExternalReferenceDeleted",
      payload,
      reference.id,
      "emitCustomerExternalReferenceDeleted",
      operationIndex,
    );
  }

  private emitEvent(
    context: CustomerExternalReferenceWorkflowContext,
    eventType: string,
    payload: unknown,
    referenceId: string,
    stepId: string,
    operationIndex: number,
  ): Promise<unknown> {
    return this.broker.runWorkflow(
      "events.emit",
      {
        eventType,
        payload,
        context: {
          organizationId: context.organizationId,
          correlationId: context.requestId,
        },
        subject: { type: "customerExternalReference", id: referenceId },
        actor: {
          type: "service" as const,
          id: `apps:${context.appCode}:${context.installationId}`,
        },
        emitKey: `customerExternalReference:${referenceId}:${eventType}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId,
        callId: `${operationIndex}:${referenceId}`,
        organizationId: context.organizationId,
      },
    );
  }
}

function toScriptContext(context: CustomerExternalReferenceWorkflowContext): RunScriptContext {
  return {
    storeId: context.storeId,
    organizationId: context.organizationId,
    requestId: context.requestId,
  };
}

function toSnapshot(reference: CustomerExternalReference): CustomerExternalReferenceSnapshot {
  return {
    id: reference.id,
    storeId: reference.storeId,
    customerId: reference.customerId,
    externalSystem: reference.externalSystem,
    externalType: reference.externalType,
    externalId: reference.externalId,
    metadata: reference.metadata as Record<string, unknown>,
    createdAt: reference.createdAt,
    updatedAt: reference.updatedAt,
  };
}
