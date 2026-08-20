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

@Injectable()
export class ExpirePaymentSessionWorkflow extends BrokerWorkflows<
  Payments.ExpirePaymentParams,
  Payments.PaymentOperationAcceptedResult
> {
  constructor(
    @InjectBroker("payments") broker: ServiceBroker,
    private readonly lifecycle: PaymentLifecycleService,
  ) {
    super(broker);
  }

  @Workflow("expireSession", { idempotencyStrategy: "workflow" })
  async run(input: Payments.ExpirePaymentParams): Promise<Payments.PaymentOperationAcceptedResult> {
    let current = await this.load(input.storeId, input.paymentSessionId);
    if (
      current.session.providerReference &&
      ["REQUIRES_ACTION", "REQUIRES_CONFIRMATION", "PENDING"].includes(current.session.state)
    ) {
      try {
        await this.cancelProvider(input, current.session.revision);
        current = await this.load(input.storeId, input.paymentSessionId);
        if (current.session.state === "CANCELLED") {
          const operation = current.operations.at(-1);
          if (!operation) throw new Error("PAYMENT_OPERATION_NOT_FOUND");
          return {
            paymentCollectionId: current.session.paymentCollectionId,
            paymentSessionId: current.session.paymentSessionId,
            operationId: operation.operationId,
            workflowId: DBOS.workflowID!,
            duplicate: false,
          };
        }
      } catch (error) {
        if (!isUnsupportedCancellation(error)) throw error;
      }
    }
    const expireInput =
      current.session.revision === input.expectedSessionRevision
        ? input
        : { ...input, expectedSessionRevision: current.session.revision };
    const expired = await this.expire(expireInput);
    await this.publish(input, expired.operation.operationId);
    return {
      paymentCollectionId: expired.collection.paymentCollectionId,
      paymentSessionId: expired.session.paymentSessionId,
      operationId: expired.operation.operationId,
      workflowId: DBOS.workflowID!,
      duplicate: expired.duplicate,
    };
  }

  @WorkflowStep()
  private expire(input: Payments.ExpirePaymentParams) {
    return this.lifecycle.expireSession(input);
  }

  @WorkflowStep()
  private load(storeId: string, paymentSessionId: string) {
    return this.lifecycle.getSession({ storeId, paymentSessionId });
  }

  private cancelProvider(input: Payments.ExpirePaymentParams, expectedSessionRevision: number) {
    return this.broker.runWorkflow<Payments.PaymentOperationAcceptedResult>(
      "payments.executeOperation",
      {
        type: "CANCEL",
        params: {
          storeId: input.storeId,
          paymentSessionId: input.paymentSessionId,
          expectedSessionRevision,
          reason: input.reason,
          idempotencyKey: `${input.idempotencyKey}:provider-cancel`,
          correlationId: input.correlationId,
        },
      },
      {
        source: "workflow",
        organizationId: input.organizationId,
        workflowId: DBOS.workflowID!,
        stepId: "cancelExpiredProviderPayment",
        callId: input.paymentSessionId,
      },
    );
  }

  private publish(input: Payments.ExpirePaymentParams, operationId: string) {
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

function isUnsupportedCancellation(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("PAYMENT_PROVIDER_OPERATION_UNAVAILABLE") ||
      error.message.includes("PAYMENT_PROVIDER_ROUTE_UNAVAILABLE") ||
      error.message.includes("PAYMENT_NOT_CANCELLABLE"))
  );
}
