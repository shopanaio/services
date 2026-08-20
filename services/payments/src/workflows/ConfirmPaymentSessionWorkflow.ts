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
import type {
  PreparedPaymentConfirmation,
  PreparedPaymentSession,
} from "../infrastructure/db/PaymentLifecycleRepository.js";

export interface ConfirmPaymentSessionInput {
  organizationId: string;
  storeId: string;
  paymentSessionId: string;
  operationId: string;
  correlationId: string;
}

@Injectable()
export class ConfirmPaymentSessionWorkflow extends BrokerWorkflows<
  ConfirmPaymentSessionInput,
  Readonly<{ paymentSessionId: string; confirmationOperationId: string }>
> {
  constructor(
    @InjectBroker("payments") broker: ServiceBroker,
    private readonly lifecycle: PaymentLifecycleService,
  ) {
    super(broker);
  }

  @Workflow("confirmSession", { idempotencyStrategy: "workflow" })
  async run(input: ConfirmPaymentSessionInput) {
    const prepared = await this.load(input);
    const confirmation = await this.requestConfirmation(prepared);
    const confirmationOperation = await this.prepareConfirmation(prepared, confirmation);
    if (confirmationOperation.request && confirmationOperation.operation.state === "PROCESSING") {
      const result = await this.invoke(confirmationOperation);
      await this.complete(confirmationOperation, result);
    }
    await this.publish(input, confirmationOperation.operation.operationId);
    return {
      paymentSessionId: prepared.session.paymentSessionId,
      confirmationOperationId: confirmationOperation.operation.operationId,
    };
  }

  @WorkflowStep()
  private load(input: ConfirmPaymentSessionInput) {
    return this.lifecycle.getPreparedSessionForConfirmation(input);
  }

  @WorkflowStep()
  private requestConfirmation(prepared: PreparedPaymentSession) {
    return this.lifecycle.requestSettlementConfirmation(prepared);
  }

  @WorkflowStep()
  private prepareConfirmation(
    prepared: PreparedPaymentSession,
    confirmation: Payments.PaymentSettlementConfirmation,
  ) {
    return this.lifecycle.prepareConfirmation(prepared, confirmation);
  }

  @WorkflowStep({
    timeoutMs: 125_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private invoke(prepared: PreparedPaymentConfirmation) {
    return this.lifecycle.invokeConfirmation(prepared);
  }

  @WorkflowStep()
  private complete(
    prepared: PreparedPaymentConfirmation,
    result: Payments.PaymentProviderOperationResult,
  ) {
    return this.lifecycle.completePreparedConfirmation(prepared, result);
  }

  private publish(input: ConfirmPaymentSessionInput, operationId: string) {
    return this.broker.runWorkflow(
      "payments.publishEvents",
      { source: "OPERATION", operationId },
      {
        source: "workflow",
        organizationId: input.organizationId,
        workflowId: DBOS.workflowID!,
        stepId: "publishPaymentEvents",
        callId: operationId,
      },
    );
  }
}
