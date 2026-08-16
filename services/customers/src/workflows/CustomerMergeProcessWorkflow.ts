import { Injectable } from "@nestjs/common";
import type { CustomerMergedEvent } from "@shopana/events";
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
import {
  CustomerMergeProcessScript,
  type CustomerMergeProcessResult,
} from "../scripts/lifecycle/CustomerMergeProcessScript.js";
import type { CustomerMutationWorkflowContext } from "./dto/index.js";

export interface CustomerMergeProcessWorkflowInput {
  mergeId: string;
  context: CustomerMutationWorkflowContext;
}

export type CustomerMergeProcessWorkflowResult = CustomerMergeProcessResult;

@Injectable()
export class CustomerMergeProcessWorkflow extends BrokerWorkflows<
  CustomerMergeProcessWorkflowInput,
  CustomerMergeProcessWorkflowResult
> {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("customerMergeProcess")
  @Policy<CustomerMergeProcessWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(
    input: CustomerMergeProcessWorkflowInput,
  ): Promise<CustomerMergeProcessWorkflowResult> {
    const started = await this.stepBegin(input);
    if (started.status === "COMPLETED") {
      await this.emitCustomerMerged(input, started);
      return started;
    }

    let completed: CustomerMergeProcessResult;
    try {
      completed = await this.stepApply(input);
    } catch (error) {
      return this.stepFail(input, serializeError(error));
    }
    await this.emitCustomerMerged(input, completed);
    return completed;
  }

  @WorkflowStep({
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private stepBegin(input: CustomerMergeProcessWorkflowInput) {
    return this.kernel.runScript(
      CustomerMergeProcessScript,
      { phase: "BEGIN", mergeId: input.mergeId },
      toScriptContext(input.context),
    );
  }

  @WorkflowStep({
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private stepApply(input: CustomerMergeProcessWorkflowInput) {
    return this.kernel.runScript(
      CustomerMergeProcessScript,
      { phase: "APPLY", mergeId: input.mergeId },
      toScriptContext(input.context),
    );
  }

  @WorkflowStep({
    retry: { maxAttempts: 10, intervalSeconds: 1, backoffRate: 2 },
  })
  private stepFail(
    input: CustomerMergeProcessWorkflowInput,
    error: { code: string; message: string; retryable: boolean },
  ) {
    return this.kernel.runScript(
      CustomerMergeProcessScript,
      {
        phase: "FAIL",
        mergeId: input.mergeId,
        error: { ...error, failureId: DBOS.workflowID! },
      },
      toScriptContext(input.context),
    );
  }

  @WorkflowStep({
    retry: { maxAttempts: 10, intervalSeconds: 1, backoffRate: 2 },
  })
  private async emitCustomerMerged(
    input: CustomerMergeProcessWorkflowInput,
    result: CustomerMergeProcessResult,
  ): Promise<void> {
    if (
      result.status !== "COMPLETED" ||
      !result.sourceCustomerId ||
      !result.targetCustomerId ||
      result.mergeRevision === undefined ||
      !result.completedAt
    ) {
      return;
    }
    const payload: CustomerMergedEvent["payload"] = {
      schemaVersion: 1,
      storeId: input.context.storeId,
      mergeId: result.mergeId,
      mergeRevision: result.mergeRevision,
      sourceCustomerId: result.sourceCustomerId,
      targetCustomerId: result.targetCustomerId,
      completedAt: result.completedAt,
    };
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "customerMerged",
        payload,
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "customer", id: result.sourceCustomerId },
        actor: input.context.userId
          ? { type: "user" as const, id: input.context.userId }
          : undefined,
        emitKey: `customer-merge:${result.mergeId}:${result.mergeRevision}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitCustomerMerged",
        callId: result.mergeId,
        organizationId: input.context.organizationId,
      },
    );
  }
}

function toScriptContext(
  context: CustomerMutationWorkflowContext,
): RunScriptContext {
  return {
    storeId: context.storeId,
    organizationId: context.organizationId,
    locale: context.locale,
    userId: context.userId,
    requestId: context.requestId,
  };
}

function serializeError(error: unknown): {
  code: string;
  message: string;
  retryable: boolean;
} {
  const value = error as {
    code?: unknown;
    message?: unknown;
    retryable?: unknown;
  };
  return {
    code:
      typeof value?.code === "string"
        ? value.code
        : "CUSTOMER_MERGE_PROCESS_FAILED",
    message:
      typeof value?.message === "string"
        ? value.message
        : "Customer merge processing failed",
    retryable: value?.retryable !== false,
  };
}
