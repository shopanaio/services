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

@Injectable()
export class CreatePaymentSessionWorkflow extends BrokerWorkflows<
  Payments.CreatePaymentSessionParams,
  Payments.CreatePaymentSessionResult
> {
  constructor(
    @InjectBroker("payments") broker: ServiceBroker,
    private readonly lifecycle: PaymentLifecycleService,
  ) {
    super(broker);
  }

  @Workflow("createSession", { idempotencyStrategy: "workflow" })
  async run(
    input: Payments.CreatePaymentSessionParams,
  ): Promise<Payments.CreatePaymentSessionResult> {
    const prepared = await this.prepare(input);
    if (prepared.operation.state === "PROCESSING") {
      const providerResult = await this.invokeProvider(prepared);
      await this.complete(prepared, providerResult);
      await this.publish(prepared.operation.operationId, prepared.session.organizationId);
      if (providerResult.status === "REQUIRES_CONFIRMATION") {
        const confirmation = await this.requestConfirmation(prepared);
        const confirmationOperation = await this.prepareConfirmation(prepared, confirmation);
        if (
          confirmationOperation.request &&
          confirmationOperation.operation.state === "PROCESSING"
        ) {
          const confirmationResult = await this.invokeConfirmation(confirmationOperation);
          await this.completeConfirmation(confirmationOperation, confirmationResult);
        }
        await this.publish(
          confirmationOperation.operation.operationId,
          confirmationOperation.session.organizationId,
        );
      }
    } else {
      await this.publish(prepared.operation.operationId, prepared.session.organizationId);
    }
    return {
      paymentCollectionId: prepared.collection.paymentCollectionId,
      paymentSessionId: prepared.session.paymentSessionId,
      operationId: prepared.operation.operationId,
      workflowId: DBOS.workflowID!,
      duplicate: prepared.duplicate,
    };
  }

  @WorkflowStep()
  private prepare(input: Payments.CreatePaymentSessionParams) {
    return this.lifecycle.prepareSession(input);
  }

  @WorkflowStep({
    timeoutMs: 125_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private invokeProvider(prepared: PreparedPaymentSession) {
    return this.lifecycle.invokeProvider(prepared);
  }

  @WorkflowStep()
  private complete(
    prepared: PreparedPaymentSession,
    result: Payments.PaymentProviderOperationResult,
  ) {
    return this.lifecycle.completeInitialOperation(prepared, result);
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
  private invokeConfirmation(prepared: PreparedPaymentConfirmation) {
    return this.lifecycle.invokeConfirmation(prepared);
  }

  @WorkflowStep()
  private completeConfirmation(
    prepared: PreparedPaymentConfirmation,
    result: Payments.PaymentProviderOperationResult,
  ) {
    return this.lifecycle.completePreparedConfirmation(prepared, result);
  }

  private publish(operationId: string, organizationId: string) {
    return this.broker.runWorkflow(
      "payments.publishEvents",
      { source: "OPERATION", operationId },
      {
        source: "workflow",
        organizationId,
        workflowId: DBOS.workflowID!,
        stepId: "publishPaymentEvents",
        callId: operationId,
      },
    );
  }
}
