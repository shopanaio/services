import { Injectable } from "@nestjs/common";
import {
  DeliveryActions,
  InventoryCheckoutActions,
  LoyaltyCheckoutActions,
  OrderLoyaltyActions,
  PricingCheckoutActions,
  type Delivery,
  type Inventory,
  type Pricing,
  type CommitCheckoutLoyaltyRedemptionResult,
  type PublishOrderLoyaltyRewardEligibleResult,
  type ReleaseCheckoutLoyaltyRedemptionResult,
  type TransitionCheckoutLoyaltyRewardResult,
} from "@shopana/broker-types";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { CheckoutMutationRepository } from "../infrastructure/mutations/CheckoutMutationRepository.js";
import {
  CheckoutPlacementRepository,
  type CheckoutPlacementRecord,
} from "../infrastructure/mutations/CheckoutPlacementRepository.js";
import type {
  PlaceOrderWorkflowInput,
  PlaceOrderWorkflowResult,
} from "./PlaceOrderWorkflow.js";
import type { MonitorPlacedPaymentInput } from "./MonitorPlacedPaymentWorkflow.js";
import type { LoyaltyReservation } from "./PlaceOrderWorkflow.js";
import { canonicalJsonSha256 } from "../application/pipeline/canonicalJson.js";

export interface CheckoutMaintenanceInput {
  minuteBucket: string;
}

@Injectable()
export class CheckoutMaintenanceWorkflow extends BrokerWorkflows<
  CheckoutMaintenanceInput,
  { reconciled: number; recovered: number; compensationsResolved: number; expired: number; anonymized: number; purged: number }
> {
  constructor(
    @InjectBroker("checkout") broker: ServiceBroker,
    private readonly checkouts: CheckoutMutationRepository,
    private readonly placements: CheckoutPlacementRepository,
  ) {
    super(broker);
  }

  @Workflow("maintainCheckout", { idempotencyStrategy: "content" })
  async run(_input: CheckoutMaintenanceInput) {
    const retention = await this.enforceRetention();
    const stuck = await this.findStuckPlacements();
    let reconciled = 0;
    let recovered = 0;
    for (const placement of stuck) {
      const status = await this.getWorkflowStatus(placement.workflowId);
      const action = placementRecoveryAction(status?.status, status?.output);
      if (action === "COMPLETE") {
        await this.completePlacement(
          placement.placementId,
          status!.output as PlaceOrderWorkflowResult,
        );
        reconciled += 1;
      } else if (action === "RECOVER") {
        const request = assertPlaceOrderInput(placement.requestInput);
        await this.startPlacementRecovery(request, placement.workflowId, placement.placementId);
        recovered += 1;
      }
    }
    const monitors = await this.findPendingPaymentMonitors();
    for (const placement of monitors) {
      if (!placement.paymentMonitorWorkflowId) continue;
      const status = await this.getWorkflowStatus(placement.paymentMonitorWorkflowId);
      if (!isTerminalWorkflowFailure(status?.status)) continue;
      const input = assertPaymentMonitorInput(placement.paymentMonitorInput);
      const monitor = await this.startPaymentMonitorRecovery(
        input,
        placement.paymentMonitorWorkflowId,
        placement.placementId,
      );
      await this.markPaymentMonitorStarted(
        placement.placementId,
        monitor.workflowId,
        placement.paymentMonitorWorkflowId,
      );
      recovered += 1;
    }
    const unresolved = await this.findUnresolvedCompensations();
    let compensationsResolved = 0;
    for (const placement of unresolved) {
      await this.retryCompensations(placement);
      await this.clearCompensationFailures(placement.placementId);
      compensationsResolved += placement.compensationFailures.length;
    }
    return { reconciled, recovered, compensationsResolved, ...retention };
  }

  @WorkflowStep()
  private enforceRetention() {
    return this.checkouts.enforceRetention();
  }

  @WorkflowStep()
  private findStuckPlacements() {
    return this.placements.listStuck(300);
  }

  @WorkflowStep()
  private getWorkflowStatus(workflowId: string) {
    return DBOS.getWorkflowStatus(workflowId);
  }

  @WorkflowStep()
  private async completePlacement(
    placementId: string,
    result: PlaceOrderWorkflowResult,
  ): Promise<void> {
    await this.placements.complete(
      placementId,
      result,
      result.status === "PAYMENT_FAILED" ? "ABANDONED" : "PLACED",
    );
  }

  @WorkflowStep()
  private findPendingPaymentMonitors() {
    return this.placements.listPendingPaymentMonitors();
  }

  @WorkflowStep()
  private startPlacementRecovery(
    input: PlaceOrderWorkflowInput,
    failedWorkflowId: string,
    placementId: string,
  ) {
    return this.broker.startWorkflow(
      "checkout.placeOrder",
      { ...input, recoveryOfWorkflowId: failedWorkflowId },
      {
        source: "workflow",
        organizationId: input.organizationId,
        workflowId: failedWorkflowId,
        stepId: "recoverPlaceOrder",
        callId: placementId,
      },
    );
  }

  @WorkflowStep()
  private startPaymentMonitorRecovery(
    input: MonitorPlacedPaymentInput,
    failedWorkflowId: string,
    placementId: string,
  ) {
    return this.broker.startWorkflow(
      "checkout.monitorPlacedPayment",
      input,
      {
        source: "workflow",
        organizationId: input.organizationId,
        workflowId: failedWorkflowId,
        stepId: "recoverPaymentMonitor",
        callId: placementId,
      },
    );
  }

  @WorkflowStep()
  private markPaymentMonitorStarted(
    placementId: string,
    workflowId: string,
    previousWorkflowId: string,
  ): Promise<void> {
    return this.placements.markPaymentMonitorStarted(placementId, workflowId, previousWorkflowId);
  }

  @WorkflowStep()
  private findUnresolvedCompensations() {
    return this.placements.listUnresolvedCompensations();
  }

  @WorkflowStep()
  private async retryCompensations(placement: CheckoutPlacementRecord): Promise<void> {
    const request = assertPlaceOrderInput(placement.requestInput);
    const operations = new Set(placement.compensationFailures.map(({ operation }) => operation));
    const knownOperations = new Set([
      "releaseInventory",
      "reverseDiscountUsage",
      "releaseDiscountUsage",
      "releaseLoyalty:ORDER_FAILED",
      "releaseLoyalty:PAYMENT_FAILED",
      "releaseDelivery",
      "confirmInventory",
      "commitLoyaltyAt",
      "publishOrderRewardEligible",
      "markOrderCreated",
    ]);
    const unknown = [...operations].find((operation) => !knownOperations.has(operation));
    if (unknown) throw new Error(`CHECKOUT_COMPENSATION_OPERATION_UNSUPPORTED:${unknown}`);
    assertCompensationRecoveryData(placement, operations);
    const orderId = placement.orderId ?? placement.requestedOrderId;
    if (operations.has("releaseInventory")) {
      if (!orderId) throw new Error("CHECKOUT_COMPENSATION_ORDER_ID_MISSING");
      await this.broker.call<
        Inventory.ReleaseCheckoutInventoryResult,
        Inventory.ReleaseCheckoutInventoryParams
      >(InventoryCheckoutActions.release, {
        storeId: placement.storeId,
        orderId,
        idempotencyKey: `${placement.idempotencyKey}:inventory-release`,
        correlationId: request.correlationId,
      });
    }
    if (operations.has("reverseDiscountUsage")) {
      await this.broker.call<
        Pricing.ReverseCheckoutDiscountUsageResult,
        Pricing.ReverseCheckoutDiscountUsageParams
      >(PricingCheckoutActions.reverseUsage, {
        storeId: placement.storeId,
        redemptionIds: placement.discountRedemptionIds,
        reason: "Checkout placement did not reach a payable order state.",
      });
    }
    if (operations.has("releaseDiscountUsage")) {
      await this.broker.call<
        Pricing.ReleaseCheckoutDiscountUsageResult,
        Pricing.ReleaseCheckoutDiscountUsageParams
      >(PricingCheckoutActions.releaseUsage, {
        storeId: placement.storeId,
        reservationIds: placement.discountReservationIds,
      });
    }
    const loyaltyOperation = operations.has("releaseLoyalty:ORDER_FAILED")
      ? "releaseLoyalty:ORDER_FAILED"
      : operations.has("releaseLoyalty:PAYMENT_FAILED")
        ? "releaseLoyalty:PAYMENT_FAILED"
        : null;
    if (loyaltyOperation) {
      const failure = placement.compensationFailures.find(({ operation }) => operation === loyaltyOperation);
      await this.releaseLoyalty(
        placement,
        request,
        assertLoyaltyReservation(placement.loyaltyReservation),
        loyaltyOperation.endsWith("ORDER_FAILED") ? "ORDER_FAILED" : "PAYMENT_FAILED",
        failure?.recordedAt ?? placement.updatedAt,
      );
    }
    if (operations.has("releaseDelivery")) {
      const failure = placement.compensationFailures.find(({ operation }) => operation === "releaseDelivery");
      await this.releaseDelivery(placement, failure?.recordedAt ?? placement.updatedAt);
    }
    if (operations.has("markOrderCreated")) {
      if (!orderId) throw new Error("CHECKOUT_COMPENSATION_ORDER_ID_MISSING");
      await this.advanceOrderCreated(placement.placementId, orderId);
    }
    if (operations.has("confirmInventory")) {
      if (!orderId) throw new Error("CHECKOUT_COMPENSATION_ORDER_ID_MISSING");
      await this.confirmInventory(placement.storeId, orderId);
    }
    if (operations.has("commitLoyaltyAt")) {
      if (!orderId) throw new Error("CHECKOUT_COMPENSATION_ORDER_ID_MISSING");
      const failure = placement.compensationFailures.find(({ operation }) => operation === "commitLoyaltyAt");
      await this.commitLoyalty(
        placement,
        assertLoyaltyReservation(placement.loyaltyReservation),
        orderId,
        failure?.recordedAt ?? placement.updatedAt,
      );
    }
    if (operations.has("publishOrderRewardEligible")) {
      if (!orderId) throw new Error("CHECKOUT_COMPENSATION_ORDER_ID_MISSING");
      const failure = placement.compensationFailures.find(({ operation }) => operation === "publishOrderRewardEligible");
      await this.publishRewardEligible(placement, request, orderId, failure?.recordedAt ?? placement.updatedAt);
    }
  }

  private async releaseDelivery(
    placement: CheckoutPlacementRecord,
    releasedAt: string,
  ): Promise<void> {
    if (placement.deliveryGroupIds.length === 0) return;
    await this.broker.call<
      Delivery.ReleaseCheckoutDeliverySelectionsResult,
      Delivery.ReleaseCheckoutDeliverySelectionsParams
    >(DeliveryActions.releaseSelections, {
      storeId: placement.storeId,
      checkoutId: placement.checkoutId,
      checkoutVersion: placement.checkoutVersion,
      groupIds: placement.deliveryGroupIds,
      reason: "Checkout placement did not reach a payable order state.",
      releasedAt,
      idempotencyKey: `${placement.idempotencyKey}:delivery-release`,
    });
  }

  private async confirmInventory(storeId: string, orderId: string): Promise<void> {
    await this.broker.call<
      Inventory.ConfirmCheckoutInventoryResult,
      Inventory.ConfirmCheckoutInventoryParams
    >(InventoryCheckoutActions.confirm, { storeId, orderId });
  }

  private async advanceOrderCreated(placementId: string, orderId: string): Promise<void> {
    await this.placements.transition(placementId, {
      from: "RESOURCES_RESERVED",
      to: "ORDER_CREATED",
      orderId,
    });
  }

  private async commitLoyalty(
    placement: CheckoutPlacementRecord,
    reservation: LoyaltyReservation,
    orderId: string,
    committedAt: string,
  ): Promise<void> {
    if (reservation.points) {
      const idempotencyKey = `${placement.idempotencyKey}:loyalty-commit`;
      const base = {
        storeId: placement.storeId,
        checkoutId: placement.checkoutId,
        checkoutVersion: placement.checkoutVersion,
        reservationId: reservation.points.reservationId,
        quoteId: reservation.points.quoteId,
        quoteRevision: reservation.points.quoteRevision,
        orderId,
        orderRevision: 1,
        committedAt,
        idempotencyKey,
      };
      const result = await this.broker.call<
        CommitCheckoutLoyaltyRedemptionResult,
        import("@shopana/broker-types").CommitCheckoutLoyaltyRedemptionParams
      >(LoyaltyCheckoutActions.commitRedemption, {
        ...base,
        requestHash: canonicalJsonSha256(base),
      });
      if (result.status !== "COMMITTED") throw new Error(`LOYALTY_${result.code}`);
    }
    if (reservation.reward) {
      const result = await this.broker.call<TransitionCheckoutLoyaltyRewardResult>(
        LoyaltyCheckoutActions.commitReward,
        {
          storeId: placement.storeId,
          checkoutId: placement.checkoutId,
          entitlementId: reservation.reward.entitlementId,
          orderId,
          externalReference: reservation.reward.externalReference,
          committedAt,
          idempotencyKey: `${placement.idempotencyKey}:loyalty-reward-commit:${orderId}`,
        },
      );
      if (result.status === "REJECTED") throw new Error(`LOYALTY_${result.code}`);
    }
  }

  private async publishRewardEligible(
    placement: CheckoutPlacementRecord,
    request: PlaceOrderWorkflowInput,
    orderId: string,
    eligibleAt: string,
  ): Promise<void> {
    await this.broker.call<PublishOrderLoyaltyRewardEligibleResult>(
      OrderLoyaltyActions.publishEligible,
      {
        organizationId: request.organizationId,
        storeId: placement.storeId,
        orderId,
        orderRevision: 1,
        eligibleAt,
        correlationId: request.correlationId,
      },
    );
  }

  private async releaseLoyalty(
    placement: CheckoutPlacementRecord,
    request: PlaceOrderWorkflowInput,
    reservation: LoyaltyReservation | null,
    reason: "ORDER_FAILED" | "PAYMENT_FAILED",
    releasedAt: string,
  ): Promise<void> {
    if (!reservation) return;
    if (reservation.points) {
      const idempotencyKey = `${placement.idempotencyKey}:loyalty-release:${reason}`;
      const base = {
        storeId: placement.storeId,
        checkoutId: placement.checkoutId,
        reservationId: reservation.points.reservationId,
        reason,
        releasedAt,
        idempotencyKey,
      };
      const result = await this.broker.call<
        ReleaseCheckoutLoyaltyRedemptionResult,
        import("@shopana/broker-types").ReleaseCheckoutLoyaltyRedemptionParams
      >(LoyaltyCheckoutActions.releaseRedemption, {
        ...base,
        requestHash: canonicalJsonSha256(base),
      });
      if (result.status === "REJECTED") throw new Error(`LOYALTY_${result.code}`);
    }
    if (reservation.reward) {
      const result = await this.broker.call<TransitionCheckoutLoyaltyRewardResult>(
        LoyaltyCheckoutActions.releaseReward,
        {
          storeId: placement.storeId,
          checkoutId: placement.checkoutId,
          entitlementId: reservation.reward.entitlementId,
          releasedAt,
          idempotencyKey: `${placement.idempotencyKey}:loyalty-reward-release:${request.checkoutId}:${reason}`,
        },
      );
      if (result.status === "REJECTED") throw new Error(`LOYALTY_${result.code}`);
    }
  }

  @WorkflowStep()
  private clearCompensationFailures(placementId: string): Promise<void> {
    return this.placements.clearCompensationFailures(placementId);
  }
}

function isPlacementResult(value: unknown): value is PlaceOrderWorkflowResult {
  return Boolean(
    value && typeof value === "object" &&
    "placementId" in value && typeof value.placementId === "string" &&
    "orderId" in value && typeof value.orderId === "string" &&
    "status" in value && typeof value.status === "string",
  );
}

export function isTerminalWorkflowFailure(status: string | undefined): boolean {
  return status === "ERROR" ||
    status === "CANCELLED" ||
    status === "MAX_RECOVERY_ATTEMPTS_EXCEEDED";
}

export function placementRecoveryAction(
  status: string | undefined,
  output: unknown,
): "COMPLETE" | "RECOVER" | "WAIT" {
  if (status === "SUCCESS" && isPlacementResult(output)) return "COMPLETE";
  if (isTerminalWorkflowFailure(status)) return "RECOVER";
  return "WAIT";
}

export function assertCompensationRecoveryData(
  placement: CheckoutPlacementRecord,
  operations: ReadonlySet<string>,
): void {
  const orderBoundOperations = [
    "releaseInventory",
    "confirmInventory",
    "commitLoyaltyAt",
    "publishOrderRewardEligible",
    "markOrderCreated",
  ];
  if (
    orderBoundOperations.some((operation) => operations.has(operation)) &&
    !placement.orderId &&
    !placement.requestedOrderId
  ) {
    throw new Error("CHECKOUT_COMPENSATION_ORDER_ID_MISSING");
  }
  if (
    operations.has("commitLoyaltyAt") &&
    placement.loyaltyReservation === null
  ) {
    throw new Error("CHECKOUT_LOYALTY_COMPENSATION_INPUT_INVALID");
  }
  if (
    operations.has("reverseDiscountUsage") &&
    !placement.discountRedemptionIds.length
  ) {
    throw new Error("CHECKOUT_COMPENSATION_DISCOUNT_REDEMPTIONS_MISSING");
  }
  if (
    operations.has("releaseDiscountUsage") &&
    !placement.discountReservationIds.length
  ) {
    throw new Error("CHECKOUT_COMPENSATION_DISCOUNT_RESERVATIONS_MISSING");
  }
  if (
    (operations.has("releaseLoyalty:ORDER_FAILED") ||
      operations.has("releaseLoyalty:PAYMENT_FAILED")) &&
    placement.loyaltyReservation === null
  ) {
    throw new Error("CHECKOUT_LOYALTY_COMPENSATION_INPUT_INVALID");
  }
}

function assertPlaceOrderInput(value: unknown): PlaceOrderWorkflowInput {
  if (!value || typeof value !== "object" || !("checkoutId" in value) || !("idempotencyKey" in value)) {
    throw new Error("CHECKOUT_PLACEMENT_RECOVERY_INPUT_INVALID");
  }
  return value as PlaceOrderWorkflowInput;
}

function assertPaymentMonitorInput(value: unknown): MonitorPlacedPaymentInput {
  if (!value || typeof value !== "object" || !("placementId" in value) || !("sessionParams" in value)) {
    throw new Error("CHECKOUT_PAYMENT_MONITOR_RECOVERY_INPUT_INVALID");
  }
  return value as MonitorPlacedPaymentInput;
}

function assertLoyaltyReservation(value: unknown): LoyaltyReservation {
  if (!value || typeof value !== "object" || !("points" in value) || !("reward" in value)) {
    throw new Error("CHECKOUT_LOYALTY_COMPENSATION_INPUT_INVALID");
  }
  return value as LoyaltyReservation;
}
