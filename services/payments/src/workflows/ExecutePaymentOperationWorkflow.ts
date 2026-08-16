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
import type { PreparedPaymentOperation } from "../infrastructure/db/PaymentLifecycleRepository.js";

export type ExecutePaymentOperationInput =
  | Readonly<{ type: "CANCEL"; params: Payments.CancelPaymentParams }>
  | Readonly<{ type: "CAPTURE"; params: Payments.CapturePaymentParams }>
  | Readonly<{ type: "VOID"; params: Payments.VoidPaymentParams }>
  | Readonly<{ type: "REFUND"; params: Payments.RefundPaymentParams }>
  | Readonly<{ type: "RECONCILE"; params: Payments.ReconcilePaymentParams }>;

@Injectable()
export class ExecutePaymentOperationWorkflow extends BrokerWorkflows<
  ExecutePaymentOperationInput,
  Payments.PaymentOperationAcceptedResult
> {
  constructor(
    @InjectBroker("payments") broker: ServiceBroker,
    private readonly lifecycle: PaymentLifecycleService,
  ) {
    super(broker);
  }

  @Workflow("executeOperation", { idempotencyStrategy: "workflow" })
  async run(input: ExecutePaymentOperationInput): Promise<Payments.PaymentOperationAcceptedResult> {
    let prepared = await this.prepare(input);
    let monitorExpiresAt: string | null = null;
    if (input.type === "CAPTURE" && prepared.operation.state === "PROCESSING") {
      const confirmation = await this.requestSettlement(prepared);
      prepared = await this.applySettlement(prepared, confirmation);
    }
    if (prepared.operation.state === "PROCESSING") {
      const result = await this.invoke(prepared);
      await this.complete(prepared, result);
      monitorExpiresAt = operationMonitorExpiry(result);
    }
    await this.publish(prepared);
    if (monitorExpiresAt) {
      await this.startMonitor(prepared, monitorExpiresAt);
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
  private prepare(input: ExecutePaymentOperationInput) {
    return this.lifecycle.prepareOperation(input.params, input.type);
  }

  @WorkflowStep({
    timeoutMs: 125_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private invoke(prepared: PreparedPaymentOperation) {
    return this.lifecycle.invokeOperation(prepared);
  }

  @WorkflowStep()
  private requestSettlement(prepared: PreparedPaymentOperation) {
    return this.lifecycle.requestOperationSettlement(prepared);
  }

  @WorkflowStep()
  private applySettlement(
    prepared: PreparedPaymentOperation,
    confirmation: Payments.PaymentSettlementConfirmation,
  ) {
    return this.lifecycle.applyOperationSettlement(prepared, confirmation);
  }

  @WorkflowStep()
  private complete(
    prepared: PreparedPaymentOperation,
    result: Payments.PaymentProviderOperationResult | Payments.PaymentProviderReconcileResult,
  ) {
    return this.lifecycle.completePreparedOperation(prepared, result);
  }

  private publish(prepared: PreparedPaymentOperation) {
    return this.broker.runWorkflow(
      "payments.publishEvents",
      { source: "OPERATION", operationId: prepared.operation.operationId },
      {
        source: "workflow",
        organizationId: prepared.session.organizationId,
        workflowId: DBOS.workflowID!,
        stepId: "publishPaymentEvents",
        callId: prepared.operation.operationId,
      },
    );
  }

  private startMonitor(
    prepared: PreparedPaymentOperation,
    expiresAt: string,
  ) {
    return this.broker.startWorkflow(
      "payments.monitorOperation",
      {
        organizationId: prepared.session.organizationId,
        storeId: prepared.session.storeId,
        paymentSessionId: prepared.session.paymentSessionId,
        operationId: prepared.operation.operationId,
        expiresAt,
        idempotencyKey: prepared.operation.idempotency.key,
        correlationId: prepared.request.correlationId,
      },
      {
        source: "workflow",
        organizationId: prepared.session.organizationId,
        workflowId: DBOS.workflowID!,
        stepId: "monitorPaymentOperation",
        callId: prepared.operation.operationId,
      },
    );
  }
}

function operationMonitorExpiry(
  result: Payments.PaymentProviderOperationResult | Payments.PaymentProviderReconcileResult,
): string | null {
  if (result.status === "PENDING") return result.pendingExpiresAt;
  if (result.status === "REQUIRES_ACTION") return result.customerAction.expiresAt;
  return null;
}
