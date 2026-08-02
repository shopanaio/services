import { Injectable } from "@nestjs/common";
import {
  InventoryCheckoutActions,
  PricingCheckoutActions,
  type Inventory,
  type Payments,
  type Pricing,
} from "@shopana/broker-types";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { CheckoutPlacementRepository } from "../infrastructure/mutations/CheckoutPlacementRepository.js";
import type { PlaceOrderWorkflowResult } from "./PlaceOrderWorkflow.js";

export interface MonitorPlacedPaymentInput {
  organizationId: string;
  storeId: string;
  placementId: string;
  orderId: string;
  initialResult: PlaceOrderWorkflowResult;
  sessionParams: Payments.CreatePaymentSessionParams;
  redemptionIds: readonly string[];
  idempotencyKey: string;
  correlationId: string;
}

@Injectable()
export class MonitorPlacedPaymentWorkflow extends BrokerWorkflows<
  MonitorPlacedPaymentInput,
  PlaceOrderWorkflowResult
> {
  constructor(
    @InjectBroker("checkout") broker: ServiceBroker,
    private readonly placements: CheckoutPlacementRepository,
  ) {
    super(broker);
  }

  @Workflow("monitorPlacedPayment", { idempotencyStrategy: "workflow" })
  async run(input: MonitorPlacedPaymentInput): Promise<PlaceOrderWorkflowResult> {
    const workflowId = DBOS.workflowID;
    if (!workflowId || !input.initialResult.paymentSessionId) {
      throw new Error("PAYMENT_MONITOR_WORKFLOW_CONTEXT_MISSING");
    }

    let providerRetry = 0;
    for (;;) {
      const current = await this.loadSession(
        input.storeId,
        input.initialResult.paymentSessionId,
      );
      const session = current.session;
      const operation = current.operations.at(-1);
      if (!operation) throw new Error("PAYMENT_OPERATION_NOT_FOUND");

      if (isSettled(session.state)) {
        await this.confirmInventory(input.storeId, input.orderId);
        return this.replacePlacementResult(
          input.placementId,
          paymentResult(input.initialResult, session, operation.operationId),
        );
      }
      if (isTerminalFailure(session.state)) {
        await this.releaseInventory(input);
        await this.reverseDiscountUsage(input);
        return this.replacePlacementResult(
          input.placementId,
          paymentResult(input.initialResult, session, operation.operationId),
        );
      }

      if (session.state === "PROCESSING") {
        try {
          providerRetry += 1;
          await this.broker.runWorkflow<
            Payments.CreatePaymentSessionResult,
            Payments.CreatePaymentSessionParams
          >(
            "payments.createSession",
            input.sessionParams,
            {
              source: "workflow",
              organizationId: input.organizationId,
              workflowId,
              stepId: "retryCreatePaymentSession",
              callId: `${session.paymentSessionId}:${providerRetry}`,
            },
          );
        } catch {
          const now = await DBOS.now();
          const retryAt = new Date(now + providerRetryDelay(providerRetry)).toISOString();
          await this.renewInventory(input.storeId, input.orderId, retryAt);
          await DBOS.sleep(providerRetryDelay(providerRetry));
        }
        continue;
      }

      const now = await DBOS.now();
      const deadline = paymentDeadline(session);
      const delay = Date.parse(deadline) - now;
      if (delay > 0) {
        if (delay > 1_000) {
          const inventoryDeadline = new Date(Math.max(Date.parse(deadline), now + 60_000))
            .toISOString();
          await this.renewInventory(input.storeId, input.orderId, inventoryDeadline);
        }
        await DBOS.sleep(delay);
        continue;
      }

      try {
        await this.broker.runWorkflow<
          Payments.PaymentOperationAcceptedResult,
          Payments.ExpirePaymentParams
        >(
          "payments.expireSession",
          {
            organizationId: input.organizationId,
            storeId: input.storeId,
            paymentSessionId: session.paymentSessionId,
            expectedSessionRevision: session.revision,
            reason: "Checkout payment was not completed before its deadline.",
            idempotencyKey: `${input.idempotencyKey}:payment-expire`,
            correlationId: input.correlationId,
          },
          {
            source: "workflow",
            organizationId: input.organizationId,
            workflowId,
            stepId: "expirePaymentSession",
            callId: `${session.paymentSessionId}:${session.revision}`,
          },
        );
      } catch (error) {
        if (!isPaymentRevisionConflict(error)) throw error;
      }
    }
  }

  @WorkflowStep()
  private loadSession(storeId: string, paymentSessionId: string) {
    return this.broker.call<
      Payments.GetPaymentSessionResult,
      Payments.GetPaymentSessionParams
    >("payments.getPaymentSession", { storeId, paymentSessionId });
  }

  @WorkflowStep()
  private async renewInventory(
    storeId: string,
    orderId: string,
    expiresAt: string,
  ): Promise<void> {
    await this.broker.call<
      Inventory.RenewCheckoutInventoryResult,
      Inventory.RenewCheckoutInventoryParams
    >(InventoryCheckoutActions.renew, { storeId, orderId, expiresAt });
  }

  @WorkflowStep()
  private async confirmInventory(storeId: string, orderId: string): Promise<void> {
    await this.broker.call<
      Inventory.ConfirmCheckoutInventoryResult,
      Inventory.ConfirmCheckoutInventoryParams
    >(InventoryCheckoutActions.confirm, { storeId, orderId });
  }

  @WorkflowStep()
  private async releaseInventory(input: MonitorPlacedPaymentInput): Promise<void> {
    await this.broker.call<
      Inventory.ReleaseCheckoutInventoryResult,
      Inventory.ReleaseCheckoutInventoryParams
    >(InventoryCheckoutActions.release, {
      storeId: input.storeId,
      orderId: input.orderId,
      idempotencyKey: `${input.idempotencyKey}:inventory-release`,
      correlationId: input.correlationId,
    });
  }

  @WorkflowStep()
  private async reverseDiscountUsage(input: MonitorPlacedPaymentInput): Promise<void> {
    if (input.redemptionIds.length === 0) return;
    await this.broker.call<
      Pricing.ReverseCheckoutDiscountUsageResult,
      Pricing.ReverseCheckoutDiscountUsageParams
    >(PricingCheckoutActions.reverseUsage, {
      storeId: input.storeId,
      redemptionIds: input.redemptionIds,
      reason: "Checkout payment expired or failed before settlement.",
    });
  }

  @WorkflowStep()
  private async replacePlacementResult(
    placementId: string,
    result: PlaceOrderWorkflowResult,
  ): Promise<PlaceOrderWorkflowResult> {
    const placement = await this.placements.replaceResult(placementId, result);
    return placement.result!;
  }
}

function paymentDeadline(session: Payments.PaymentSessionSnapshot): string {
  if (session.state === "PENDING") {
    return earliestTimestamp(session.expiresAt, session.pendingExpiresAt);
  }
  if (session.state === "REQUIRES_CONFIRMATION") {
    return earliestTimestamp(session.expiresAt, session.confirmationExpiresAt);
  }
  if (session.state === "REQUIRES_ACTION") {
    return earliestTimestamp(session.expiresAt, session.customerAction?.expiresAt);
  }
  return session.expiresAt;
}

function earliestTimestamp(platformDeadline: string, providerDeadline?: string | null): string {
  if (!providerDeadline) return platformDeadline;
  return Date.parse(providerDeadline) < Date.parse(platformDeadline)
    ? providerDeadline
    : platformDeadline;
}

function isSettled(state: Payments.PaymentSessionState): boolean {
  return state === "AUTHORIZED" || state === "PARTIALLY_CAPTURED" || state === "CAPTURED";
}

function isTerminalFailure(state: Payments.PaymentSessionState): boolean {
  return state === "FAILED" || state === "EXPIRED" || state === "CANCELLED" ||
    state === "VOIDED" || state === "REFUNDED" || state === "PARTIALLY_REFUNDED";
}

function paymentResult(
  initial: PlaceOrderWorkflowResult,
  session: Payments.PaymentSessionSnapshot,
  operationId: string,
): PlaceOrderWorkflowResult {
  const status = session.state === "CAPTURED"
    ? "PAID"
    : session.state === "AUTHORIZED" || session.state === "PARTIALLY_CAPTURED"
      ? "AUTHORIZED"
      : "PAYMENT_FAILED";
  return {
    ...initial,
    status,
    paymentOperationId: operationId,
    customerAction: session.customerAction,
    paymentFailure: session.lastFailure,
  };
}

function providerRetryDelay(attempt: number): number {
  return Math.min(30_000 * 2 ** Math.min(attempt - 1, 4), 5 * 60_000);
}

function isPaymentRevisionConflict(error: unknown): boolean {
  return error instanceof Error &&
    error.message.includes("PAYMENT_SESSION_REVISION_CONFLICT");
}
