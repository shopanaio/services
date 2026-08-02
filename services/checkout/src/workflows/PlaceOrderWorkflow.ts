import { Injectable } from "@nestjs/common";
import type { CheckoutDto } from "@shopana/checkout-sdk";
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
import {
  assertCompletePipelineResult,
  committedCheckoutToDto,
  type CheckoutCommittedSnapshot,
} from "../application/mutations/index.js";
import { canonicalJsonSha256 } from "../application/pipeline/canonicalJson.js";
import { CheckoutMutationRepository } from "../infrastructure/mutations/CheckoutMutationRepository.js";
import { CheckoutPlacementRepository } from "../infrastructure/mutations/CheckoutPlacementRepository.js";

export interface PlaceOrderWorkflowInput {
  organizationId: string;
  storeId: string;
  checkoutId: string;
  expectedCheckoutVersion: number;
  expectedResultRevision: string;
  idempotencyKey: string;
  correlationId: string;
  credentialId: string;
  userId: string | null;
  returnUrl: string | null;
}

export type PlaceOrderStatus =
  | "PAYMENT_NOT_REQUIRED"
  | "REQUIRES_ACTION"
  | "REQUIRES_CONFIRMATION"
  | "PAYMENT_PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "PAYMENT_FAILED";

export interface PlaceOrderWorkflowResult {
  placementId: string;
  orderId: string;
  status: PlaceOrderStatus;
  paymentCollectionId: string | null;
  paymentSessionId: string | null;
  paymentOperationId: string | null;
  customerAction: Payments.PaymentCustomerAction | null;
  paymentFailure: Payments.PaymentFailure | null;
}

interface PlaceOrderSnapshot {
  placementId: string;
  checkout: CheckoutDto;
  checkoutVersion: number;
  quoteId: string;
  quoteRevision: string;
  paymentMethodsRevision: string;
  amount: Payments.CreatePaymentCollectionParams["targetAmount"];
  usageRequirements: readonly Pricing.PricingCheckoutDiscountUsageRequirement[];
  inventoryLines: Inventory.ReserveCheckoutInventoryParams["lines"];
  selectedPayment: null | {
    methodHandle: string;
    customerInput: Payments.PaymentsCheckoutMethodSelectionIntent["customerInput"];
  };
  customer: Payments.PaymentProviderCustomerSnapshot | null;
  reservationExpiresAt: string;
}

type PlaceOrderClaim =
  | Readonly<{ status: "COMPLETED"; result: PlaceOrderWorkflowResult }>
  | Readonly<{ status: "READY"; snapshot: PlaceOrderSnapshot }>;

interface DiscountReservation {
  reservationIds: readonly string[];
}

interface CommittedDiscountUsage {
  redemptionIds: readonly string[];
}

interface PaymentOutcome {
  result: PlaceOrderWorkflowResult;
  sessionParams: Payments.CreatePaymentSessionParams;
}

interface StoreOrganizationResult {
  store: null | Readonly<{ organizationId: string }>;
  userErrors: readonly Readonly<{ message: string }>[];
}

@Injectable()
export class PlaceOrderWorkflow extends BrokerWorkflows<
  PlaceOrderWorkflowInput,
  PlaceOrderWorkflowResult
> {
  constructor(
    @InjectBroker("checkout") broker: ServiceBroker,
    private readonly checkouts: CheckoutMutationRepository,
    private readonly placements: CheckoutPlacementRepository,
  ) {
    super(broker);
  }

  @Workflow("placeOrder", { idempotencyStrategy: "client" })
  async run(input: PlaceOrderWorkflowInput): Promise<PlaceOrderWorkflowResult> {
    await this.validateTenant(input);
    const claim = await this.claim(input);
    if (claim.status === "COMPLETED") return claim.result;
    const snapshot = claim.snapshot;

    let discounts: DiscountReservation;
    try {
      discounts = await this.reserveDiscountUsage(input, snapshot);
    } catch (error) {
      if (isNonRetryablePricingFailure(error)) {
        await this.abandonPlacement(snapshot.placementId);
      }
      throw error;
    }
    const requestedOrderId = await this.generateOrderId();
    try {
      await this.reserveInventory(input, snapshot, requestedOrderId);
    } catch (error) {
      await this.releaseInventory(input, requestedOrderId);
      await this.releaseDiscountUsage(input.storeId, discounts);
      await this.abandonPlacement(snapshot.placementId);
      throw error;
    }

    let committedDiscounts: CommittedDiscountUsage;
    try {
      committedDiscounts = await this.commitDiscountUsage(
        input,
        snapshot,
        discounts,
        requestedOrderId,
      );
    } catch (error) {
      await this.releaseInventory(input, requestedOrderId);
      await this.releaseDiscountUsage(input.storeId, discounts);
      await this.abandonPlacement(snapshot.placementId);
      throw error;
    }

    let orderId: string;
    try {
      orderId = await this.createOrder(input, snapshot, requestedOrderId);
    } catch (error) {
      await this.releaseInventory(input, requestedOrderId);
      await this.reverseDiscountUsage(input.storeId, committedDiscounts);
      await this.abandonPlacement(snapshot.placementId);
      throw error;
    }

    let result: PlaceOrderWorkflowResult;
    let paymentOutcome: PaymentOutcome | null = null;
    if (BigInt(snapshot.amount.amountMinor) === 0n) {
      await this.confirmInventory(input.storeId, orderId);
      result = {
        placementId: snapshot.placementId,
        orderId,
        status: "PAYMENT_NOT_REQUIRED",
        paymentCollectionId: null,
        paymentSessionId: null,
        paymentOperationId: null,
        customerAction: null,
        paymentFailure: null,
      };
    } else {
      if (!snapshot.selectedPayment) {
        await this.releaseInventory(input, orderId);
        await this.reverseDiscountUsage(input.storeId, committedDiscounts);
        await this.abandonPlacement(snapshot.placementId);
        throw new Error("CHECKOUT_PAYMENT_METHOD_REQUIRED");
      }
      try {
        paymentOutcome = await this.createPayment(input, snapshot, orderId);
        result = paymentOutcome.result;
      } catch (error) {
        await this.releaseInventory(input, orderId);
        await this.reverseDiscountUsage(input.storeId, committedDiscounts);
        await this.abandonPlacement(snapshot.placementId);
        throw error;
      }
      if (result.status === "PAYMENT_FAILED") {
        await this.releaseInventory(input, orderId);
        await this.reverseDiscountUsage(input.storeId, committedDiscounts);
      } else if (result.status === "AUTHORIZED" || result.status === "PAID") {
        await this.confirmInventory(input.storeId, orderId);
      }
    }

    const completed = await this.completePlacement(snapshot.placementId, result);
    if (paymentOutcome && isPendingPaymentResult(completed)) {
      await this.startPaymentMonitor(
        input,
        snapshot,
        completed,
        paymentOutcome.sessionParams,
        committedDiscounts,
      );
    }
    return completed;
  }

  @WorkflowStep()
  private async validateTenant(input: PlaceOrderWorkflowInput): Promise<void> {
    validatePlaceOrderInput(input);
    const result = await this.broker.call<
      StoreOrganizationResult,
      { id: string }
    >("project.getStoreById", { id: input.storeId });
    if (!result.store) {
      throw new Error(result.userErrors[0]?.message ?? "PLACE_ORDER_STORE_NOT_FOUND");
    }
    if (result.store.organizationId !== input.organizationId) {
      throw new Error("PLACE_ORDER_ORGANIZATION_MISMATCH");
    }
  }

  @WorkflowStep()
  private async claim(input: PlaceOrderWorkflowInput): Promise<PlaceOrderClaim> {
    const requestHash = canonicalJsonSha256({
      organizationId: input.organizationId,
      storeId: input.storeId,
      checkoutId: input.checkoutId,
      expectedCheckoutVersion: input.expectedCheckoutVersion,
      expectedResultRevision: input.expectedResultRevision,
      credentialId: input.credentialId,
      userId: input.userId,
      returnUrl: input.returnUrl,
    });
    const checkout = await this.checkouts.load({
      storeId: input.storeId,
      checkoutId: input.checkoutId,
    });
    if (!checkout) throw new Error("CHECKOUT_NOT_FOUND");
    validateCheckoutSnapshot(checkout, input);

    const finalQuote = checkout.result.finalPricing;
    const payment = checkout.result.payment;
    if (finalQuote.status !== "SUCCESS" || payment.status !== "SUCCESS") {
      throw new Error("CHECKOUT_PIPELINE_INCOMPLETE");
    }
    const selection = payment.data.selection;
    const selectedPayment = selection.status === "SELECTED"
      ? {
          methodHandle: selection.methodHandle,
          customerInput: selection.customerInput,
        }
      : null;
    if (
      BigInt(finalQuote.data.totals.payableTotal.amountMinor) > 0n &&
      !selectedPayment
    ) {
      throw new Error("CHECKOUT_PAYMENT_METHOD_REQUIRED");
    }
    const placement = await this.placements.claim({
      storeId: input.storeId,
      checkoutId: input.checkoutId,
      checkoutVersion: input.expectedCheckoutVersion,
      resultRevision: input.expectedResultRevision,
      idempotencyKey: input.idempotencyKey,
      requestHash,
    });
    if (placement.status === "PLACED") {
      if (!placement.result) throw new Error("CHECKOUT_PLACEMENT_RESULT_MISSING");
      return {
        status: "COMPLETED",
        result: placement.result as PlaceOrderWorkflowResult,
      };
    }
    const buyer = checkout.draft.buyerIdentity;

    return {
      status: "READY",
      snapshot: {
        placementId: placement.placementId,
        checkout: committedCheckoutToDto(checkout),
        checkoutVersion: checkout.version,
        quoteId: finalQuote.data.quoteId,
        quoteRevision: finalQuote.data.revision,
        paymentMethodsRevision: payment.data.revision,
        amount: finalQuote.data.totals.payableTotal,
        usageRequirements: finalQuote.data.usageRequirements,
        inventoryLines: inventoryLines(finalQuote.data.lines),
        selectedPayment,
        customer: buyer
          ? {
              customerReference: buyer.customerId,
              email: buyer.email,
              phone: buyer.phone,
              billingAddress: null,
            }
          : null,
        reservationExpiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      },
    };
  }

  @WorkflowStep()
  private async reserveDiscountUsage(
    input: PlaceOrderWorkflowInput,
    snapshot: PlaceOrderSnapshot,
  ): Promise<DiscountReservation> {
    if (snapshot.usageRequirements.length === 0) return { reservationIds: [] };
    const reserved = await this.broker.call<
      Pricing.ReserveCheckoutDiscountUsageResult,
      Pricing.ReserveCheckoutDiscountUsageParams
    >(PricingCheckoutActions.reserveUsage, {
      storeId: input.storeId,
      checkoutId: input.checkoutId,
      quoteId: snapshot.quoteId,
      quoteRevision: snapshot.quoteRevision,
      idempotencyKey: `${input.idempotencyKey}:discount-reserve`,
      expiresAt: snapshot.reservationExpiresAt,
      requirements: snapshot.usageRequirements,
    });
    return {
      reservationIds: reserved.reservations.map(({ reservationId }) => reservationId),
    };
  }

  @WorkflowStep()
  private async generateOrderId(): Promise<string> {
    const result = await this.broker.call<{ id: string }>("order.generateOrderId", {});
    return result.id;
  }

  @WorkflowStep()
  private async reserveInventory(
    input: PlaceOrderWorkflowInput,
    snapshot: PlaceOrderSnapshot,
    orderId: string,
  ): Promise<void> {
    await this.broker.call<
      Inventory.ReserveCheckoutInventoryResult,
      Inventory.ReserveCheckoutInventoryParams
    >(InventoryCheckoutActions.reserve, {
      storeId: input.storeId,
      orderId,
      idempotencyKey: `${input.idempotencyKey}:inventory-reserve`,
      correlationId: input.correlationId,
      expiresAt: snapshot.reservationExpiresAt,
      lines: snapshot.inventoryLines,
    });
  }

  @WorkflowStep()
  private createOrder(
    input: PlaceOrderWorkflowInput,
    snapshot: PlaceOrderSnapshot,
    orderId: string,
  ): Promise<string> {
    return this.broker.call<string>("order.createOrderFromCheckoutPlacement", {
      orderId,
      storeId: input.storeId,
      checkoutId: input.checkoutId,
      credentialId: input.credentialId,
      userId: input.userId,
      idempotencyKey: `${input.idempotencyKey}:order`,
      checkout: snapshot.checkout,
    });
  }

  private async createPayment(
    input: PlaceOrderWorkflowInput,
    snapshot: PlaceOrderSnapshot,
    orderId: string,
  ): Promise<PaymentOutcome> {
    const workflowId = DBOS.workflowID;
    if (!workflowId || !snapshot.selectedPayment) {
      throw new Error("PLACE_ORDER_WORKFLOW_CONTEXT_MISSING");
    }
    const collection = await this.broker.runWorkflow<
      Payments.CreatePaymentCollectionResult,
      Payments.CreatePaymentCollectionParams
    >(
      "payments.createCollection",
      {
        organizationId: input.organizationId,
        storeId: input.storeId,
        checkoutId: input.checkoutId,
        orderId,
        expectedCheckoutVersion: snapshot.checkoutVersion,
        finalQuoteRevision: snapshot.quoteRevision,
        targetAmount: snapshot.amount,
        idempotencyKey: `${input.idempotencyKey}:payment-collection`,
        correlationId: input.correlationId,
      },
      {
        source: "workflow",
        organizationId: input.organizationId,
        workflowId,
        stepId: "createPaymentCollection",
        callId: orderId,
      },
    );
    const sessionParams: Payments.CreatePaymentSessionParams = {
      organizationId: input.organizationId,
      storeId: input.storeId,
      checkoutId: input.checkoutId,
      orderId,
      paymentCollectionId: collection.paymentCollectionId,
      expectedCheckoutVersion: snapshot.checkoutVersion,
      finalQuoteRevision: snapshot.quoteRevision,
      paymentMethodsRevision: snapshot.paymentMethodsRevision,
      methodHandle: snapshot.selectedPayment.methodHandle,
      kind: "SALE",
      amount: snapshot.amount,
      expiresAt: snapshot.reservationExpiresAt,
      returnUrl: input.returnUrl,
      customer: snapshot.customer,
      customerInput: snapshot.selectedPayment.customerInput,
      idempotencyKey: `${input.idempotencyKey}:payment-session`,
      correlationId: input.correlationId,
    };
    let session: Payments.CreatePaymentSessionResult;
    try {
      session = await this.broker.runWorkflow<
        Payments.CreatePaymentSessionResult,
        Payments.CreatePaymentSessionParams
      >(
        "payments.createSession",
        sessionParams,
        {
          source: "workflow",
          organizationId: input.organizationId,
          workflowId,
          stepId: "createPaymentSession",
          callId: collection.paymentCollectionId,
        },
      );
    } catch (error) {
      const persisted = await this.loadPaymentCollection(
        input.storeId,
        collection.paymentCollectionId,
      );
      const latest = persisted.sessions.at(-1);
      if (!latest) throw error;
      const operations = await this.loadPaymentSession(
        input.storeId,
        latest.paymentSessionId,
      );
      const operation = operations.operations.at(-1);
      if (!operation) throw error;
      session = {
        paymentCollectionId: collection.paymentCollectionId,
        paymentSessionId: latest.paymentSessionId,
        operationId: operation.operationId,
        workflowId,
        duplicate: true,
      };
    }
    const current = await this.loadPaymentSession(input.storeId, session.paymentSessionId);
    return {
      result: toPlaceOrderResult(snapshot.placementId, orderId, session, current.session),
      sessionParams,
    };
  }

  @WorkflowStep()
  private loadPaymentCollection(storeId: string, paymentCollectionId: string) {
    return this.broker.call<
      Payments.GetPaymentCollectionResult,
      Payments.GetPaymentCollectionParams
    >("payments.getPaymentCollection", { storeId, paymentCollectionId });
  }

  @WorkflowStep()
  private loadPaymentSession(storeId: string, paymentSessionId: string) {
    return this.broker.call<
      Payments.GetPaymentSessionResult,
      Payments.GetPaymentSessionParams
    >("payments.getPaymentSession", { storeId, paymentSessionId });
  }

  @WorkflowStep()
  private async commitDiscountUsage(
    input: PlaceOrderWorkflowInput,
    snapshot: PlaceOrderSnapshot,
    reservation: DiscountReservation,
    orderId: string,
  ): Promise<CommittedDiscountUsage> {
    if (snapshot.usageRequirements.length === 0) return { redemptionIds: [] };
    const committed = await this.broker.call<
      Pricing.CommitCheckoutDiscountUsageResult,
      Pricing.CommitCheckoutDiscountUsageParams
    >(PricingCheckoutActions.commitUsage, {
      storeId: input.storeId,
      checkoutId: input.checkoutId,
      quoteId: snapshot.quoteId,
      quoteRevision: snapshot.quoteRevision,
      orderId,
      idempotencyKey: `${input.idempotencyKey}:discount-commit`,
      reservationIds: reservation.reservationIds,
    });
    return {
      redemptionIds: committed.redemptions.map(({ redemptionId }) => redemptionId),
    };
  }

  @WorkflowStep()
  private async reverseDiscountUsage(
    storeId: string,
    committed: CommittedDiscountUsage,
  ): Promise<void> {
    if (committed.redemptionIds.length === 0) return;
    await this.broker.call<
      Pricing.ReverseCheckoutDiscountUsageResult,
      Pricing.ReverseCheckoutDiscountUsageParams
    >(PricingCheckoutActions.reverseUsage, {
      storeId,
      redemptionIds: committed.redemptionIds,
      reason: "Checkout placement did not reach a payable order state.",
    });
  }

  @WorkflowStep()
  private async releaseDiscountUsage(
    storeId: string,
    reservation: DiscountReservation,
  ): Promise<void> {
    if (reservation.reservationIds.length === 0) return;
    await this.broker.call<
      Pricing.ReleaseCheckoutDiscountUsageResult,
      Pricing.ReleaseCheckoutDiscountUsageParams
    >(PricingCheckoutActions.releaseUsage, {
      storeId,
      reservationIds: reservation.reservationIds,
    });
  }

  @WorkflowStep()
  private async releaseInventory(
    input: PlaceOrderWorkflowInput,
    orderId: string,
  ): Promise<void> {
    await this.broker.call<
      Inventory.ReleaseCheckoutInventoryResult,
      Inventory.ReleaseCheckoutInventoryParams
    >(InventoryCheckoutActions.release, {
      storeId: input.storeId,
      orderId,
      idempotencyKey: `${input.idempotencyKey}:inventory-release`,
      correlationId: input.correlationId,
    });
  }

  @WorkflowStep()
  private async confirmInventory(storeId: string, orderId: string): Promise<void> {
    await this.broker.call<
      Inventory.ConfirmCheckoutInventoryResult,
      Inventory.ConfirmCheckoutInventoryParams
    >(InventoryCheckoutActions.confirm, { storeId, orderId });
  }

  private startPaymentMonitor(
    input: PlaceOrderWorkflowInput,
    snapshot: PlaceOrderSnapshot,
    result: PlaceOrderWorkflowResult,
    sessionParams: Payments.CreatePaymentSessionParams,
    committedDiscounts: CommittedDiscountUsage,
  ): Promise<{ workflowId: string; status: "started" }> {
    const workflowId = DBOS.workflowID;
    if (!workflowId || !result.paymentSessionId) {
      throw new Error("PLACE_ORDER_WORKFLOW_CONTEXT_MISSING");
    }
    return this.broker.startWorkflow(
      "checkout.monitorPlacedPayment",
      {
        organizationId: input.organizationId,
        storeId: input.storeId,
        placementId: snapshot.placementId,
        orderId: result.orderId,
        initialResult: result,
        sessionParams,
        redemptionIds: committedDiscounts.redemptionIds,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
      },
      {
        source: "workflow",
        organizationId: input.organizationId,
        workflowId,
        stepId: "monitorPlacedPayment",
        callId: result.paymentSessionId,
      },
    );
  }

  @WorkflowStep()
  private async completePlacement(
    placementId: string,
    result: PlaceOrderWorkflowResult,
  ): Promise<PlaceOrderWorkflowResult> {
    const completed = await this.placements.complete(placementId, result);
    return completed.result!;
  }

  @WorkflowStep()
  private abandonPlacement(placementId: string): Promise<void> {
    return this.placements.abandon(placementId);
  }
}

function validatePlaceOrderInput(input: PlaceOrderWorkflowInput): void {
  for (const [field, value] of [
    ["organizationId", input.organizationId],
    ["storeId", input.storeId],
    ["checkoutId", input.checkoutId],
    ["correlationId", input.correlationId],
  ] as const) {
    if (!isUuid(value)) throw new Error(`PLACE_ORDER_${field.toUpperCase()}_INVALID`);
  }
  if (
    !Number.isSafeInteger(input.expectedCheckoutVersion) ||
    input.expectedCheckoutVersion <= 0
  ) {
    throw new Error("PLACE_ORDER_CHECKOUT_VERSION_INVALID");
  }
  for (const [field, value] of [
    ["expectedResultRevision", input.expectedResultRevision],
    ["idempotencyKey", input.idempotencyKey],
    ["credentialId", input.credentialId],
  ] as const) {
    if (value.trim().length === 0) {
      throw new Error(`PLACE_ORDER_${field.toUpperCase()}_INVALID`);
    }
  }
  if (
    input.expectedResultRevision.length > 256 ||
    input.idempotencyKey.length > 200 ||
    input.correlationId.length > 255
  ) {
    throw new Error("PLACE_ORDER_INPUT_TOO_LONG");
  }
  if (input.returnUrl !== null) {
    let returnUrl: URL;
    try {
      returnUrl = new URL(input.returnUrl);
    } catch {
      throw new Error("PLACE_ORDER_RETURN_URL_INVALID");
    }
    if (returnUrl.protocol !== "https:" || input.returnUrl.length > 2_048) {
      throw new Error("PLACE_ORDER_RETURN_URL_INVALID");
    }
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isNonRetryablePricingFailure(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "retryable" in error &&
    error.retryable === false &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("PRICING_"),
  );
}

function isPendingPaymentResult(result: PlaceOrderWorkflowResult): boolean {
  return result.status === "REQUIRES_ACTION" ||
    result.status === "REQUIRES_CONFIRMATION" ||
    result.status === "PAYMENT_PENDING";
}

function validateCheckoutSnapshot(
  checkout: CheckoutCommittedSnapshot,
  input: PlaceOrderWorkflowInput,
): void {
  if (
    checkout.storeId !== input.storeId ||
    checkout.checkoutId !== input.checkoutId ||
    checkout.version !== input.expectedCheckoutVersion ||
    checkout.result.resultRevision !== input.expectedResultRevision
  ) {
    throw new Error("CHECKOUT_PLACEMENT_SNAPSHOT_STALE");
  }
  assertCompletePipelineResult(checkout.result);
  if (
    checkout.result.validation.status !== "SUCCESS" ||
    !checkout.result.validation.data.valid
  ) {
    throw new Error("CHECKOUT_NOT_READY_FOR_PLACEMENT");
  }
  if (checkout.draft.cartIntent.lines.length === 0) {
    throw new Error("CHECKOUT_EMPTY");
  }
}

function inventoryLines(
  lines: readonly Pricing.PricingCheckoutQuotedLine[],
): Inventory.ReserveCheckoutInventoryParams["lines"] {
  return lines.flatMap((line) => [
    {
      lineId: line.lineId,
      variantId: line.merchandise.variantId,
      quantity: line.quantity,
    },
    ...inventoryLines(line.children),
  ]);
}

function toPlaceOrderResult(
  placementId: string,
  orderId: string,
  accepted: Payments.CreatePaymentSessionResult,
  session: Payments.PaymentSessionSnapshot,
): PlaceOrderWorkflowResult {
  const status: PlaceOrderStatus = session.state === "CAPTURED"
    ? "PAID"
    : session.state === "AUTHORIZED"
      ? "AUTHORIZED"
      : session.state === "REQUIRES_ACTION"
        ? "REQUIRES_ACTION"
        : session.state === "REQUIRES_CONFIRMATION"
          ? "REQUIRES_CONFIRMATION"
          : session.state === "FAILED"
            ? "PAYMENT_FAILED"
            : "PAYMENT_PENDING";
  return {
    placementId,
    orderId,
    status,
    paymentCollectionId: accepted.paymentCollectionId,
    paymentSessionId: accepted.paymentSessionId,
    paymentOperationId: accepted.operationId,
    customerAction: session.customerAction,
    paymentFailure: session.lastFailure,
  };
}
