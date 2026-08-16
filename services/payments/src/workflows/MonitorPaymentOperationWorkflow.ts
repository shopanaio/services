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

export interface MonitorPaymentOperationInput {
  organizationId: string;
  storeId: string;
  paymentSessionId: string;
  operationId: string;
  expiresAt: string;
  idempotencyKey: string;
  correlationId: string;
}

@Injectable()
export class MonitorPaymentOperationWorkflow extends BrokerWorkflows<
  MonitorPaymentOperationInput,
  Readonly<{ operationId: string; terminal: true }>
> {
  constructor(
    @InjectBroker("payments") broker: ServiceBroker,
    private readonly lifecycle: PaymentLifecycleService,
  ) {
    super(broker);
  }

  @Workflow("monitorOperation", { idempotencyStrategy: "workflow" })
  async run(input: MonitorPaymentOperationInput) {
    for (;;) {
      const current = await this.load(input.storeId, input.paymentSessionId);
      const operation = current.operations.find(
        (candidate) => candidate.operationId === input.operationId,
      );
      if (!operation) throw new Error("PAYMENT_OPERATION_NOT_FOUND");
      if (isTerminal(operation.state)) {
        return { operationId: operation.operationId, terminal: true as const };
      }

      const now = await DBOS.now();
      const expiresAt = Date.parse(input.expiresAt);
      const reconcileAt = operation.nextReconcileAt
        ? Date.parse(operation.nextReconcileAt)
        : expiresAt;
      const wakeAt = Math.min(reconcileAt, expiresAt);
      if (wakeAt > now) {
        await DBOS.sleep(wakeAt - now);
        continue;
      }

      try {
        await this.reconcile(input, current.session.revision, operation.revision);
      } catch {
        // Provider callbacks may still win the race. The persisted state is
        // reloaded below before deciding whether this operation timed out.
      }

      const afterReconcile = await this.load(input.storeId, input.paymentSessionId);
      const reconciledOperation = afterReconcile.operations.find(
        (candidate) => candidate.operationId === input.operationId,
      );
      if (!reconciledOperation) throw new Error("PAYMENT_OPERATION_NOT_FOUND");
      if (isTerminal(reconciledOperation.state)) continue;

      const effectiveNow = await DBOS.now();
      if (effectiveNow < expiresAt) {
        await DBOS.sleep(Math.min(30_000, expiresAt - effectiveNow));
        continue;
      }
      const failed = await this.fail(input);
      await this.publish(input, failed.operation.operationId);
    }
  }

  @WorkflowStep()
  private load(storeId: string, paymentSessionId: string) {
    return this.lifecycle.getSession({ storeId, paymentSessionId });
  }

  private reconcile(
    input: MonitorPaymentOperationInput,
    expectedSessionRevision: number,
    operationRevision: number,
  ) {
    return this.broker.runWorkflow<Payments.PaymentOperationAcceptedResult>(
      "payments.executeOperation",
      {
        type: "RECONCILE",
        params: {
          storeId: input.storeId,
          paymentSessionId: input.paymentSessionId,
          expectedSessionRevision,
          idempotencyKey: `${input.idempotencyKey}:reconcile:${operationRevision}:${expectedSessionRevision}`,
          correlationId: input.correlationId,
        },
      },
      {
        source: "workflow",
        organizationId: input.organizationId,
        workflowId: DBOS.workflowID!,
        stepId: "reconcilePendingOperation",
        callId: `${input.operationId}:${operationRevision}:${expectedSessionRevision}`,
      },
    );
  }

  @WorkflowStep()
  private fail(input: MonitorPaymentOperationInput) {
    return this.lifecycle.failPendingOperation({
      storeId: input.storeId,
      paymentSessionId: input.paymentSessionId,
      operationId: input.operationId,
      expiresAt: input.expiresAt,
      correlationId: input.correlationId,
    });
  }

  private publish(input: MonitorPaymentOperationInput, operationId: string) {
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

function isTerminal(state: Payments.PaymentOperationState): boolean {
  return ["SUCCEEDED", "FAILED", "EXPIRED"].includes(state);
}
