import { Injectable } from "@nestjs/common";
import type { Payments } from "@shopana/broker-types";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { PaymentLifecycleService } from "../application/PaymentLifecycleService.js";
import type { PaymentProviderCompletionContext } from "../contracts/actions.js";

export interface CompleteProviderOperationWorkflowInput {
  params: Payments.CompleteProviderOperationParams;
  context: PaymentProviderCompletionContext;
}

@Injectable()
export class CompleteProviderOperationWorkflow extends BrokerWorkflows<
  CompleteProviderOperationWorkflowInput,
  Payments.CompleteProviderOperationResult
> {
  constructor(
    @InjectBroker("payments") broker: ServiceBroker,
    private readonly lifecycle: PaymentLifecycleService,
  ) {
    super(broker);
  }

  @Workflow("completeProviderOperation", { idempotencyStrategy: "workflow" })
  async run(input: CompleteProviderOperationWorkflowInput) {
    const result = await this.complete(input);
    await this.broker.runWorkflow(
      "payments.publishEvents",
      { source: "OPERATION", operationId: input.params.operationId },
      {
        source: "workflow",
        organizationId: input.context.organizationId,
        workflowId: DBOS.workflowID!,
        stepId: "publishPaymentEvents",
        callId: input.params.operationId,
      },
    );
    if (input.params.result.status === "REQUIRES_CONFIRMATION") {
      await this.broker.runWorkflow(
        "payments.confirmSession",
        {
          organizationId: input.context.organizationId,
          storeId: input.context.storeId,
          paymentSessionId: input.params.paymentSessionId,
          operationId: input.params.operationId,
          correlationId: input.context.correlationId ?? input.params.providerEventId,
        },
        {
          source: "workflow",
          organizationId: input.context.organizationId,
          workflowId: DBOS.workflowID!,
          stepId: "confirmPaymentSession",
          callId: input.params.operationId,
        },
      );
    }
    return result;
  }

  @WorkflowStep()
  private complete(input: CompleteProviderOperationWorkflowInput) {
    return this.lifecycle.completeProviderOperation(input.params, input.context);
  }
}

export interface ReportProviderEventWorkflowInput {
  params: Payments.ReportPaymentProviderEventParams;
  context: PaymentProviderCompletionContext;
}

@Injectable()
export class ReportProviderEventWorkflow extends BrokerWorkflows<
  ReportProviderEventWorkflowInput,
  Payments.ReportPaymentProviderEventResult
> {
  constructor(
    @InjectBroker("payments") broker: ServiceBroker,
    private readonly lifecycle: PaymentLifecycleService,
  ) {
    super(broker);
  }

  @Workflow("reportProviderEvent", { idempotencyStrategy: "workflow" })
  async run(input: ReportProviderEventWorkflowInput) {
    const result = await this.report(input);
    await this.broker.runWorkflow(
      "payments.publishEvents",
      { source: "PROVIDER_EVENT", providerEventId: input.params.providerEventId },
      {
        source: "workflow",
        organizationId: input.context.organizationId,
        workflowId: DBOS.workflowID!,
        stepId: "publishPaymentEvents",
        callId: input.params.providerEventId,
      },
    );
    return result;
  }

  @WorkflowStep()
  private report(input: ReportProviderEventWorkflowInput) {
    return this.lifecycle.reportProviderEvent(input.params, input.context);
  }
}
