import { Inject, Injectable } from "@nestjs/common";
import type { CheckoutDto } from "@shopana/checkout-sdk";
import {
  InventoryCheckoutActions,
  CustomersCheckoutActions,
  DeliveryActions,
  OrderLoyaltyActions,
  PricingCheckoutActions,
  LoyaltyCheckoutActions,
  type Inventory,
  type Delivery,
  type Payments,
  type Pricing,
  type ResolveCheckoutBuyerEligibilityResult,
  type LoyaltyCheckoutContext,
  type LoyaltyRedemptionQuote,
  type OrderLoyaltyRewardEligibilitySnapshot,
  type PublishOrderLoyaltyRewardEligibleResult,
  type ReserveCheckoutLoyaltyRedemptionResult,
  type CommitCheckoutLoyaltyRedemptionResult,
  type ReleaseCheckoutLoyaltyRedemptionResult,
  type LoyaltyRewardQuote,
  type ReserveCheckoutLoyaltyRewardResult,
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
import {
  assertCompletePipelineResult,
  committedCheckoutToDto,
  type CheckoutCommittedSnapshot,
} from "../application/mutations/index.js";
import { canonicalJsonSha256 } from "../application/pipeline/canonicalJson.js";
import { CheckoutMutationRepository } from "../infrastructure/mutations/CheckoutMutationRepository.js";
import { CheckoutPlacementRepository } from "../infrastructure/mutations/CheckoutPlacementRepository.js";
import type { CheckoutCompensationFailure } from "../infrastructure/mutations/CheckoutPlacementRepository.js";
import { assertAllowedCheckoutReturnUrl } from "../configuration/checkoutSecurity.js";
import { compensationFailures } from "../infrastructure/observability/checkoutObservability.js";

export interface PlaceOrderWorkflowInput {
  organizationId: string;
  storeId: string;
  checkoutId: string;
  expectedResultRevision: string;
  idempotencyKey: string;
  correlationId: string;
  credentialId: string;
  visitorId: string;
  userId: string | null;
  returnUrl: string | null;
  recoveryOfWorkflowId?: string;
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
    code: string;
    title: string;
    provider: string;
    flow: Payments.PaymentsCheckoutMethod["flow"];
    customerInput: Payments.PaymentsCheckoutMethodSelectionIntent["customerInput"];
  };
  customer: Payments.PaymentProviderCustomerSnapshot | null;
  reservationExpiresAt: string;
  loyalty: null | { context: LoyaltyCheckoutContext; quote: LoyaltyRedemptionQuote };
  loyaltyReward: null | { context: LoyaltyCheckoutContext; quote: LoyaltyRewardQuote };
  orderRewardEligibility: OrderLoyaltyRewardEligibilitySnapshot | null;
  deliveryRevision: string;
  deliverySelections: Delivery.CommitCheckoutDeliverySelectionsParams["selections"];
}

interface LoyaltyPointsReservation {
  reservationId: string;
  points: string;
  quoteId: string;
  quoteRevision: string;
}

interface LoyaltyRewardReservation {
  entitlementId: string;
  externalReference: string | null;
}

export interface LoyaltyReservation {
  points: LoyaltyPointsReservation | null;
  reward: LoyaltyRewardReservation | null;
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
    @Inject(CheckoutMutationRepository)
    private readonly checkouts: CheckoutMutationRepository,
    @Inject(CheckoutPlacementRepository)
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
      await this.compensateAndFail(snapshot.placementId, error, []);
      throw error;
    }
    try {
      await this.recordDiscountReservations(snapshot.placementId, discounts);
    } catch (error) {
      await this.compensateAndFail(snapshot.placementId, error, [
        ["releaseDiscountUsage", () => this.releaseDiscountUsage(input.storeId, discounts)],
      ]);
      throw error;
    }
    let loyalty: LoyaltyReservation | null;
    try {
      loyalty = await this.reserveLoyalty(input, snapshot);
    } catch (error) {
      const loyaltyFailure = error instanceof LoyaltyReservationFailure ? error : null;
      const cause = loyaltyFailure?.original ?? error;
      const actions: Array<readonly [string, () => Promise<void>]> = [
        ["releaseDiscountUsage", () => this.releaseDiscountUsage(input.storeId, discounts)],
      ];
      if (loyaltyFailure) {
        actions.push([
          "releaseLoyalty:ORDER_FAILED",
          () => this.releaseLoyalty(input, loyaltyFailure.reservation, "ORDER_FAILED"),
        ]);
      }
      await this.compensateAndFail(snapshot.placementId, cause, actions);
      throw cause;
    }
    const requestedOrderId = await this.prepareOrderId(
      snapshot.placementId,
      await this.generateOrderId(),
    );
    try {
      await this.reserveInventory(input, snapshot, requestedOrderId);
    } catch (error) {
      await this.compensateAndFail(snapshot.placementId, error, [
        ["releaseInventory", () => this.releaseInventory(input, requestedOrderId)],
        ["releaseDiscountUsage", () => this.releaseDiscountUsage(input.storeId, discounts)],
        ["releaseLoyalty:ORDER_FAILED", () => this.releaseLoyalty(input, loyalty, "ORDER_FAILED")],
      ]);
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
      await this.compensateAndFail(snapshot.placementId, error, [
        ["releaseInventory", () => this.releaseInventory(input, requestedOrderId)],
        ["releaseDiscountUsage", () => this.releaseDiscountUsage(input.storeId, discounts)],
        ["releaseLoyalty:ORDER_FAILED", () => this.releaseLoyalty(input, loyalty, "ORDER_FAILED")],
      ]);
      throw error;
    }
    try {
      await this.recordDiscountRedemptions(snapshot.placementId, committedDiscounts);
    } catch (error) {
      await this.compensateAndFail(snapshot.placementId, error, [
        ["releaseInventory", () => this.releaseInventory(input, requestedOrderId)],
        [
          "reverseDiscountUsage",
          () => this.reverseDiscountUsage(input.storeId, committedDiscounts),
        ],
        ["releaseLoyalty:ORDER_FAILED", () => this.releaseLoyalty(input, loyalty, "ORDER_FAILED")],
      ]);
      throw error;
    }

    let deliveryCommitments: readonly Delivery.DeliveryCommittedGroupSnapshot[];
    try {
      deliveryCommitments = await this.commitDelivery(input, snapshot);
    } catch (error) {
      await this.compensateAndFail(snapshot.placementId, error, [
        ["releaseInventory", () => this.releaseInventory(input, requestedOrderId)],
        [
          "reverseDiscountUsage",
          () => this.reverseDiscountUsage(input.storeId, committedDiscounts),
        ],
        ["releaseLoyalty:ORDER_FAILED", () => this.releaseLoyalty(input, loyalty, "ORDER_FAILED")],
      ]);
      throw error;
    }
    try {
      await this.recordDeliveryCommitments(snapshot.placementId, deliveryCommitments);
    } catch (error) {
      await this.compensateAndFail(snapshot.placementId, error, [
        ["releaseInventory", () => this.releaseInventory(input, requestedOrderId)],
        [
          "reverseDiscountUsage",
          () => this.reverseDiscountUsage(input.storeId, committedDiscounts),
        ],
        ["releaseLoyalty:ORDER_FAILED", () => this.releaseLoyalty(input, loyalty, "ORDER_FAILED")],
        ["releaseDelivery", () => this.releaseDelivery(input, snapshot, deliveryCommitments)],
      ]);
      throw error;
    }

    try {
      await this.markResourcesReserved(
        snapshot.placementId,
        discounts,
        loyalty,
        requestedOrderId,
        committedDiscounts,
      );
    } catch (error) {
      await this.compensateAndFail(snapshot.placementId, error, [
        ["releaseInventory", () => this.releaseInventory(input, requestedOrderId)],
        [
          "reverseDiscountUsage",
          () => this.reverseDiscountUsage(input.storeId, committedDiscounts),
        ],
        ["releaseLoyalty:ORDER_FAILED", () => this.releaseLoyalty(input, loyalty, "ORDER_FAILED")],
        ["releaseDelivery", () => this.releaseDelivery(input, snapshot, deliveryCommitments)],
      ]);
      throw error;
    }

    let orderId: string;
    try {
      orderId = await this.createOrder(input, snapshot, requestedOrderId, deliveryCommitments);
    } catch (error) {
      await this.compensateAndFail(snapshot.placementId, error, [
        ["releaseInventory", () => this.releaseInventory(input, requestedOrderId)],
        [
          "reverseDiscountUsage",
          () => this.reverseDiscountUsage(input.storeId, committedDiscounts),
        ],
        ["releaseLoyalty:ORDER_FAILED", () => this.releaseLoyalty(input, loyalty, "ORDER_FAILED")],
        ["releaseDelivery", () => this.releaseDelivery(input, snapshot, deliveryCommitments)],
      ]);
      throw error;
    }
    try {
      await this.markOrderCreated(snapshot.placementId, orderId);
    } catch (error) {
      // The order already exists at this point (createOrder above succeeded), so a
      // bookkeeping failure here must not trigger resource compensation — that would
      // release inventory/discounts/loyalty out from under a real, already-created order.
      // Record it for reconciliation and keep going; the transition itself is idempotent
      // and safe to leave for a later retry to catch up.
      await this.recordCompensationFailures(snapshot.placementId, [
        {
          operation: "markOrderCreated",
          message: errorMessage(error),
          recordedAt: new Date(await DBOS.now()).toISOString(),
        },
      ]);
    }

    let result: PlaceOrderWorkflowResult;
    let paymentOutcome: PaymentOutcome | null = null;
    if (BigInt(snapshot.amount.amountMinor) === 0n) {
      const eligibleAt = new Date(await DBOS.now()).toISOString();
      const finalizationFailures = await this.runCompensations(
        [
          [
            "commitLoyaltyAt",
            () => this.commitLoyaltyAt(input, snapshot, loyalty, orderId, eligibleAt),
          ],
          ["confirmInventory", () => this.confirmInventory(input.storeId, orderId)],
          [
            "publishOrderRewardEligible",
            () => this.publishOrderRewardEligible(input, orderId, eligibleAt),
          ],
        ],
        eligibleAt,
      );
      if (finalizationFailures.length > 0) {
        await this.recordCompensationFailures(snapshot.placementId, finalizationFailures);
      }
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
        const error = new Error("CHECKOUT_PAYMENT_METHOD_REQUIRED");
        await this.compensateAndFail(snapshot.placementId, error, [
          ["releaseInventory", () => this.releaseInventory(input, orderId)],
          [
            "reverseDiscountUsage",
            () => this.reverseDiscountUsage(input.storeId, committedDiscounts),
          ],
          [
            "releaseLoyalty:PAYMENT_FAILED",
            () => this.releaseLoyalty(input, loyalty, "PAYMENT_FAILED"),
          ],
          ["releaseDelivery", () => this.releaseDelivery(input, snapshot, deliveryCommitments)],
        ]);
        throw error;
      }
      try {
        paymentOutcome = await this.createPayment(input, snapshot, orderId);
        result = paymentOutcome.result;
      } catch (error) {
        await this.compensateAndFail(snapshot.placementId, error, [
          ["releaseInventory", () => this.releaseInventory(input, orderId)],
          [
            "reverseDiscountUsage",
            () => this.reverseDiscountUsage(input.storeId, committedDiscounts),
          ],
          [
            "releaseLoyalty:PAYMENT_FAILED",
            () => this.releaseLoyalty(input, loyalty, "PAYMENT_FAILED"),
          ],
          ["releaseDelivery", () => this.releaseDelivery(input, snapshot, deliveryCommitments)],
        ]);
        throw error;
      }
      const monitorInput =
        paymentOutcome && isPendingPaymentResult(result)
          ? paymentMonitorInput(
              input,
              snapshot,
              result,
              paymentOutcome.sessionParams,
              committedDiscounts,
              loyalty,
              deliveryCommitments,
            )
          : null;
      await this.markPaymentCreated(snapshot.placementId, result, monitorInput);
      if (result.status === "PAYMENT_FAILED") {
        const failures = await this.runCompensations([
          ["releaseInventory", () => this.releaseInventory(input, orderId)],
          [
            "reverseDiscountUsage",
            () => this.reverseDiscountUsage(input.storeId, committedDiscounts),
          ],
          [
            "releaseLoyalty:PAYMENT_FAILED",
            () => this.releaseLoyalty(input, loyalty, "PAYMENT_FAILED"),
          ],
          ["releaseDelivery", () => this.releaseDelivery(input, snapshot, deliveryCommitments)],
        ]);
        await this.recordCompensationFailures(snapshot.placementId, failures);
      } else if (result.status === "AUTHORIZED" || result.status === "PAID") {
        const eligibleAt = new Date(await DBOS.now()).toISOString();
        const finalizationFailures = await this.runCompensations(
          [
            [
              "commitLoyaltyAt",
              () => this.commitLoyaltyAt(input, snapshot, loyalty, orderId, eligibleAt),
            ],
            ["confirmInventory", () => this.confirmInventory(input.storeId, orderId)],
            [
              "publishOrderRewardEligible",
              () => this.publishOrderRewardEligible(input, orderId, eligibleAt),
            ],
          ],
          eligibleAt,
        );
        if (finalizationFailures.length > 0) {
          await this.recordCompensationFailures(snapshot.placementId, finalizationFailures);
        }
      }
    }

    if (paymentOutcome && isPendingPaymentResult(result)) {
      const monitorInput = paymentMonitorInput(
        input,
        snapshot,
        result,
        paymentOutcome.sessionParams,
        committedDiscounts,
        loyalty,
        deliveryCommitments,
      );
      const monitor = await this.startPaymentMonitor(monitorInput, input.organizationId);
      await this.markPaymentMonitorStarted(snapshot.placementId, monitor.workflowId);
    }
    return this.completePlacement(snapshot.placementId, result);
  }

  @WorkflowStep()
  private async validateTenant(input: PlaceOrderWorkflowInput): Promise<void> {
    validatePlaceOrderInput(input);
    const result = await this.broker.call<StoreOrganizationResult, { id: string }>(
      "project.getStoreById",
      { id: input.storeId },
    );
    if (!result.store) {
      throw new Error(result.userErrors[0]?.message ?? "PLACE_ORDER_STORE_NOT_FOUND");
    }
    if (result.store.organizationId !== input.organizationId) {
      throw new Error("PLACE_ORDER_ORGANIZATION_MISMATCH");
    }
  }

  @WorkflowStep()
  private async claim(input: PlaceOrderWorkflowInput): Promise<PlaceOrderClaim> {
    const workflowId = DBOS.workflowID;
    if (!workflowId) throw new Error("PLACE_ORDER_WORKFLOW_CONTEXT_MISSING");
    const requestHash = placeOrderRequestHash(input);
    const checkout = await this.checkouts.loadOwned({
      storeId: input.storeId,
      checkoutId: input.checkoutId,
      visitorId: input.visitorId,
    });
    if (!checkout) throw new Error("CHECKOUT_NOT_FOUND");
    validateCheckoutSnapshot(checkout, input);

    const finalQuote = checkout.result.finalPricing;
    const delivery = checkout.result.delivery;
    const payment = checkout.result.payment;
    if (
      finalQuote.status !== "SUCCESS" ||
      delivery.status !== "SUCCESS" ||
      payment.status !== "SUCCESS"
    ) {
      throw new Error("CHECKOUT_PIPELINE_INCOMPLETE");
    }
    const selection = payment.data.selection;
    const selectedMethod =
      selection.status === "SELECTED"
        ? payment.data.methods.find((method) => method.handle === selection.methodHandle)
        : null;
    if (selection.status === "SELECTED" && !selectedMethod) {
      throw new Error("CHECKOUT_PAYMENT_METHOD_BINDING_MISSING");
    }
    const selectedPayment =
      selection.status === "SELECTED" && selectedMethod
        ? {
            methodHandle: selection.methodHandle,
            code: selectedMethod.code,
            title: selectedMethod.title,
            provider: selectedMethod.provider,
            flow: selectedMethod.flow,
            customerInput: selection.customerInput,
          }
        : null;
    const buyer = checkout.draft.buyerIdentity;
    const orderRewardEligibility = await this.resolveOrderRewardEligibility(checkout);
    const loyaltyResult =
      checkout.result.loyalty.status === "SUCCESS" ? checkout.result.loyalty.data : null;
    const loyalty =
      loyaltyResult?.status === "QUOTED"
        ? { context: loyaltyResult.context, quote: loyaltyResult.quote }
        : null;
    const loyaltyReward =
      loyaltyResult?.rewardQuote && loyaltyResult.rewardContext
        ? { context: loyaltyResult.rewardContext, quote: loyaltyResult.rewardQuote }
        : null;
    if (
      BigInt(
        loyalty?.quote.payableAfterLoyalty.amountMinor ??
          finalQuote.data.totals.payableTotal.amountMinor,
      ) > 0n &&
      !selectedPayment
    ) {
      throw new Error("CHECKOUT_PAYMENT_METHOD_REQUIRED");
    }
    const checkoutDto = committedCheckoutToDto(checkout);
    const deliverySelections = delivery.data.groups.flatMap((group) => {
      if (group.selection.status !== "SELECTED") return [];
      const destination = checkout.draft.cartIntent.destinations.find(
        ({ destinationId }) => destinationId === group.destinationId,
      );
      const firstName = destination?.address.firstName?.trim();
      const lastName = destination?.address.lastName?.trim();
      if (!destination || !firstName || !lastName) {
        throw new Error("CHECKOUT_DELIVERY_RECIPIENT_REQUIRED");
      }
      return [
        {
          groupId: group.groupId,
          optionHandle: group.selection.optionHandle,
          customerInput: group.selection.customerInput,
          recipient: {
            firstName,
            middleName: destination.address.middleName ?? null,
            lastName,
            company: destination.address.company ?? null,
            email: destination.address.email ?? null,
            phone: destination.address.phone ?? null,
          },
        },
      ];
    });
    const placement = await this.placements.claim({
      storeId: input.storeId,
      checkoutId: input.checkoutId,
      checkoutVersion: checkout.version,
      resultRevision: input.expectedResultRevision,
      idempotencyKey: input.idempotencyKey,
      requestHash,
      credentialId: input.credentialId,
      workflowId,
      visitorId: input.visitorId,
      requestInput: publicPlaceOrderInput(input),
      recoveryOfWorkflowId: input.recoveryOfWorkflowId,
    });
    if (placement.status === "PLACED") {
      if (!placement.result) throw new Error("CHECKOUT_PLACEMENT_RESULT_MISSING");
      return {
        status: "COMPLETED",
        result: placement.result as PlaceOrderWorkflowResult,
      };
    }

    return {
      status: "READY",
      snapshot: {
        placementId: placement.placementId,
        checkout: checkoutDto,
        checkoutVersion: checkout.version,
        quoteId: finalQuote.data.quoteId,
        quoteRevision: finalQuote.data.revision,
        paymentMethodsRevision: payment.data.revision,
        amount: loyalty?.quote.payableAfterLoyalty ?? finalQuote.data.totals.payableTotal,
        usageRequirements: finalQuote.data.usageRequirements,
        inventoryLines: inventoryLines(finalQuote.data.lines),
        selectedPayment,
        customer:
          buyer || checkout.draft.billingAddress
            ? {
                customerReference: buyer?.customerId ?? null,
                email: buyer?.email ?? null,
                phone: buyer?.phone ?? null,
                billingAddress: toPaymentBillingAddress(checkout.draft.billingAddress),
              }
            : null,
        reservationExpiresAt: reservationDeadline(
          loyalty?.quote.expiresAt ?? null,
          loyaltyReward?.quote.expiresAt ?? null,
        ),
        loyalty,
        loyaltyReward,
        orderRewardEligibility,
        deliveryRevision: delivery.data.revision,
        deliverySelections,
      },
    };
  }

  private async resolveOrderRewardEligibility(
    checkout: CheckoutCommittedSnapshot,
  ): Promise<OrderLoyaltyRewardEligibilitySnapshot | null> {
    const customerId = checkout.draft.buyerIdentity?.customerId;
    if (!customerId || checkout.result.finalPricing.status !== "SUCCESS") return null;
    const effectiveAt = checkout.result.trace.startedAt;
    const eligibility = await this.broker.call<
      ResolveCheckoutBuyerEligibilityResult,
      { storeId: string; customerId: string; effectiveAt: string }
    >(CustomersCheckoutActions.resolveBuyerEligibility, {
      storeId: checkout.storeId,
      customerId,
      effectiveAt,
    });
    if (!eligibility.ok) {
      if (eligibility.retryable) throw new Error(eligibility.code);
      return null;
    }
    return createOrderRewardEligibilitySnapshot(checkout, eligibility);
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

  private async reserveLoyalty(
    input: PlaceOrderWorkflowInput,
    snapshot: PlaceOrderSnapshot,
  ): Promise<LoyaltyReservation | null> {
    if (!snapshot.loyalty && !snapshot.loyaltyReward) return null;
    if (snapshot.loyaltyReward && !snapshot.loyaltyReward.context.customerId) {
      throw new Error("LOYALTY_CUSTOMER_REQUIRED");
    }
    let points: LoyaltyPointsReservation | null = null;
    if (snapshot.loyalty) {
      const idempotencyKey = `${input.idempotencyKey}:loyalty-reserve`;
      const requestHash = canonicalJsonSha256({
        context: snapshot.loyalty.context,
        quote: snapshot.loyalty.quote,
        idempotencyKey,
      });
      const result = await this.reserveLoyaltyPoints({
        context: snapshot.loyalty.context,
        quote: snapshot.loyalty.quote,
        idempotencyKey,
        requestHash,
      });
      if (result.status !== "RESERVED") throw new Error(`LOYALTY_${result.code}`);
      points = {
        reservationId: result.reservationId,
        points: result.points,
        quoteId: snapshot.loyalty.quote.quoteId,
        quoteRevision: snapshot.loyalty.quote.revision,
      };
      const pointsReservation = { points, reward: null };
      try {
        await this.recordLoyaltyReservation(snapshot.placementId, pointsReservation);
      } catch (error) {
        throw new LoyaltyReservationFailure(error, pointsReservation);
      }
    }
    if (!snapshot.loyaltyReward) return { points, reward: null };
    const customerId = snapshot.loyaltyReward.context.customerId;
    if (!customerId) throw new Error("LOYALTY_CUSTOMER_REQUIRED");
    let rewardResult: ReserveCheckoutLoyaltyRewardResult;
    try {
      rewardResult = await this.reserveLoyaltyReward({
        storeId: input.storeId,
        checkoutId: input.checkoutId,
        customerId,
        quote: snapshot.loyaltyReward.quote,
        reservedAt: new Date(await DBOS.now()).toISOString(),
        idempotencyKey: `${input.idempotencyKey}:loyalty-reward-reserve:${input.checkoutId}`,
      });
    } catch (error) {
      throw new LoyaltyReservationFailure(error, { points, reward: null });
    }
    if (rewardResult.status !== "RESERVED") {
      throw new LoyaltyReservationFailure(new Error(`LOYALTY_${rewardResult.code}`), {
        points,
        reward: null,
      });
    }
    const reservation = {
      points,
      reward: {
        entitlementId: rewardResult.entitlementId,
        externalReference: snapshot.loyaltyReward.quote.externalReference,
      },
    };
    try {
      await this.recordLoyaltyReservation(snapshot.placementId, reservation);
    } catch (error) {
      throw new LoyaltyReservationFailure(error, reservation);
    }
    return reservation;
  }

  @WorkflowStep()
  private reserveLoyaltyPoints(
    params: import("@shopana/broker-types").ReserveCheckoutLoyaltyRedemptionParams,
  ): Promise<ReserveCheckoutLoyaltyRedemptionResult> {
    return this.broker.call(LoyaltyCheckoutActions.reserveRedemption, params);
  }

  @WorkflowStep()
  private reserveLoyaltyReward(
    params: import("@shopana/broker-types").ReserveCheckoutLoyaltyRewardParams,
  ): Promise<ReserveCheckoutLoyaltyRewardResult> {
    return this.broker.call(LoyaltyCheckoutActions.reserveReward, params);
  }

  @WorkflowStep()
  private async commitLoyaltyAt(
    input: PlaceOrderWorkflowInput,
    snapshot: PlaceOrderSnapshot,
    reservation: LoyaltyReservation | null,
    orderId: string,
    committedAt: string,
  ): Promise<void> {
    if (!reservation) return;
    if (reservation.points) {
      const idempotencyKey = `${input.idempotencyKey}:loyalty-commit`;
      const base = {
        storeId: input.storeId,
        checkoutId: input.checkoutId,
        checkoutVersion: snapshot.checkoutVersion,
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
          storeId: input.storeId,
          checkoutId: input.checkoutId,
          entitlementId: reservation.reward.entitlementId,
          orderId,
          externalReference: reservation.reward.externalReference,
          committedAt,
          idempotencyKey: `${input.idempotencyKey}:loyalty-reward-commit:${orderId}`,
        },
      );
      if (result.status === "REJECTED") throw new Error(`LOYALTY_${result.code}`);
    }
  }

  private async releaseLoyalty(
    input: PlaceOrderWorkflowInput,
    reservation: LoyaltyReservation | null,
    reason: "ORDER_FAILED" | "PAYMENT_FAILED",
  ): Promise<void> {
    return this.releaseLoyaltyAt(
      input,
      reservation,
      reason,
      new Date(await DBOS.now()).toISOString(),
    );
  }

  @WorkflowStep()
  private async releaseLoyaltyAt(
    input: PlaceOrderWorkflowInput,
    reservation: LoyaltyReservation | null,
    reason: "ORDER_FAILED" | "PAYMENT_FAILED",
    releasedAt: string,
  ): Promise<void> {
    if (!reservation) return;
    if (reservation.points) {
      const idempotencyKey = `${input.idempotencyKey}:loyalty-release:${reason}`;
      const base = {
        storeId: input.storeId,
        checkoutId: input.checkoutId,
        reservationId: reservation.points.reservationId,
        reason,
        releasedAt,
        idempotencyKey,
      } as const;
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
          storeId: input.storeId,
          checkoutId: input.checkoutId,
          entitlementId: reservation.reward.entitlementId,
          releasedAt,
          idempotencyKey: `${input.idempotencyKey}:loyalty-reward-release:${input.checkoutId}:${reason}`,
        },
      );
      if (result.status === "REJECTED") throw new Error(`LOYALTY_${result.code}`);
    }
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
  private async commitDelivery(
    input: PlaceOrderWorkflowInput,
    snapshot: PlaceOrderSnapshot,
  ): Promise<readonly Delivery.DeliveryCommittedGroupSnapshot[]> {
    if (snapshot.deliverySelections.length === 0) return [];
    const committedAt = new Date(await DBOS.now()).toISOString();
    const result = await this.broker.call<
      Delivery.CommitCheckoutDeliverySelectionsResult,
      Delivery.CommitCheckoutDeliverySelectionsParams
    >(DeliveryActions.commitSelections, {
      organizationId: input.organizationId,
      storeId: input.storeId,
      checkoutId: input.checkoutId,
      checkoutVersion: snapshot.checkoutVersion,
      deliveryRevision: snapshot.deliveryRevision,
      committedAt,
      idempotencyKey: `${input.idempotencyKey}:delivery-commit`,
      selections: snapshot.deliverySelections,
    });
    return result.commitments;
  }

  @WorkflowStep()
  private recordDeliveryCommitments(
    placementId: string,
    commitments: readonly Delivery.DeliveryCommittedGroupSnapshot[],
  ): Promise<void> {
    return this.placements.recordDeliveryCommitments(
      placementId,
      commitments.map((commitment) => commitment.groupId),
    );
  }

  @WorkflowStep()
  private async releaseDelivery(
    input: PlaceOrderWorkflowInput,
    snapshot: PlaceOrderSnapshot,
    commitments: readonly Delivery.DeliveryCommittedGroupSnapshot[],
  ): Promise<void> {
    if (commitments.length === 0) return;
    await this.broker.call<
      Delivery.ReleaseCheckoutDeliverySelectionsResult,
      Delivery.ReleaseCheckoutDeliverySelectionsParams
    >(DeliveryActions.releaseSelections, {
      storeId: input.storeId,
      checkoutId: input.checkoutId,
      checkoutVersion: snapshot.checkoutVersion,
      groupIds: commitments.map((commitment) => commitment.groupId),
      reason: "Checkout placement did not reach a payable order state.",
      releasedAt: new Date(await DBOS.now()).toISOString(),
      idempotencyKey: `${input.idempotencyKey}:delivery-release`,
    });
  }

  @WorkflowStep()
  private createOrder(
    input: PlaceOrderWorkflowInput,
    snapshot: PlaceOrderSnapshot,
    orderId: string,
    deliveryCommitments: readonly Delivery.DeliveryCommittedGroupSnapshot[],
  ): Promise<string> {
    return this.broker.call<string>("order.createOrderFromCheckoutPlacement", {
      orderId,
      organizationId: input.organizationId,
      storeId: input.storeId,
      checkoutId: input.checkoutId,
      credentialId: input.credentialId,
      userId: input.userId,
      idempotencyKey: `${input.idempotencyKey}:order`,
      checkout: snapshot.checkout,
      payment: snapshot.selectedPayment
        ? {
            code: snapshot.selectedPayment.code,
            title: snapshot.selectedPayment.title,
            provider: snapshot.selectedPayment.provider,
            flow: snapshot.selectedPayment.flow,
            customerInput: snapshot.selectedPayment.customerInput,
          }
        : null,
      loyaltyRewardEligibility: snapshot.orderRewardEligibility,
      deliveryCommitments,
    });
  }

  @WorkflowStep()
  private async publishOrderRewardEligible(
    input: PlaceOrderWorkflowInput,
    orderId: string,
    eligibleAt: string,
  ): Promise<void> {
    const result = await this.broker.call<PublishOrderLoyaltyRewardEligibleResult>(
      OrderLoyaltyActions.publishEligible,
      {
        organizationId: input.organizationId,
        storeId: input.storeId,
        orderId,
        orderRevision: 1,
        eligibleAt,
        correlationId: input.correlationId,
      },
    );
    if (!result.published) return;
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
      >("payments.createSession", sessionParams, {
        source: "workflow",
        organizationId: input.organizationId,
        workflowId,
        stepId: "createPaymentSession",
        callId: collection.paymentCollectionId,
      });
    } catch (error) {
      const persisted = await this.loadPaymentCollection(
        input.storeId,
        collection.paymentCollectionId,
      );
      const latest = persisted.sessions.at(-1);
      if (!latest) throw error;
      const operations = await this.loadPaymentSession(input.storeId, latest.paymentSessionId);
      const operation = operations.operations.at(-1);
      // Only treat this as a lost-response replay if the latest operation on the latest
      // session was actually created by this exact request's idempotency key. Otherwise
      // the error is genuine (nothing was created for this attempt) and reporting an
      // unrelated prior session's state here would silently mask a real failure.
      if (!operation || operation.idempotency.key !== sessionParams.idempotencyKey) {
        throw error;
      }
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
    return this.broker.call<Payments.GetPaymentSessionResult, Payments.GetPaymentSessionParams>(
      "payments.getPaymentSession",
      { storeId, paymentSessionId },
    );
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
  private async releaseInventory(input: PlaceOrderWorkflowInput, orderId: string): Promise<void> {
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

  @WorkflowStep()
  private startPaymentMonitor(
    monitorInput: import("./MonitorPlacedPaymentWorkflow.js").MonitorPlacedPaymentInput,
    organizationId: string,
  ): Promise<{ workflowId: string; status: "started" }> {
    const workflowId = DBOS.workflowID;
    if (!workflowId || !monitorInput.initialResult.paymentSessionId) {
      throw new Error("PLACE_ORDER_WORKFLOW_CONTEXT_MISSING");
    }
    return this.broker.startWorkflow("checkout.monitorPlacedPayment", monitorInput, {
      source: "workflow",
      organizationId,
      workflowId,
      stepId: "monitorPlacedPayment",
      callId: monitorInput.initialResult.paymentSessionId,
    });
  }

  @WorkflowStep()
  private async completePlacement(
    placementId: string,
    result: PlaceOrderWorkflowResult,
  ): Promise<PlaceOrderWorkflowResult> {
    const completed = await this.placements.complete(
      placementId,
      result,
      result.status === "PAYMENT_FAILED" ? "ABANDONED" : "PLACED",
    );
    return completed.result!;
  }

  @WorkflowStep()
  private markResourcesReserved(
    placementId: string,
    discounts: DiscountReservation,
    loyalty: LoyaltyReservation | null,
    requestedOrderId: string,
    committedDiscounts: CommittedDiscountUsage,
  ) {
    return this.placements.transition(placementId, {
      from: "CLAIMED",
      to: "RESOURCES_RESERVED",
      discountReservationIds: discounts.reservationIds,
      loyaltyReservation: loyalty,
      requestedOrderId,
      discountRedemptionIds: committedDiscounts.redemptionIds,
    });
  }

  @WorkflowStep()
  private markOrderCreated(placementId: string, orderId: string) {
    return this.placements.transition(placementId, {
      from: "RESOURCES_RESERVED",
      to: "ORDER_CREATED",
      orderId,
    });
  }

  @WorkflowStep()
  private markPaymentCreated(
    placementId: string,
    result: PlaceOrderWorkflowResult,
    paymentMonitorInput:
      import("./MonitorPlacedPaymentWorkflow.js").MonitorPlacedPaymentInput | null,
  ) {
    if (!result.paymentCollectionId || !result.paymentSessionId || !result.paymentOperationId) {
      throw new Error("CHECKOUT_PAYMENT_IDENTIFIERS_MISSING");
    }
    return this.placements.transition(placementId, {
      from: "ORDER_CREATED",
      to: "PAYMENT_CREATED",
      paymentCollectionId: result.paymentCollectionId,
      paymentSessionId: result.paymentSessionId,
      paymentOperationId: result.paymentOperationId,
      paymentMonitorInput,
    });
  }

  @WorkflowStep()
  private markPaymentMonitorStarted(placementId: string, workflowId: string): Promise<void> {
    return this.placements.markPaymentMonitorStarted(placementId, workflowId);
  }

  @WorkflowStep()
  private prepareOrderId(placementId: string, requestedOrderId: string): Promise<string> {
    return this.placements.prepareOrderId(placementId, requestedOrderId);
  }

  @WorkflowStep()
  private recordDiscountReservations(
    placementId: string,
    reservation: DiscountReservation,
  ): Promise<void> {
    return this.placements.recordDiscountReservations(placementId, reservation.reservationIds);
  }

  @WorkflowStep()
  private recordLoyaltyReservation(
    placementId: string,
    reservation: LoyaltyReservation,
  ): Promise<void> {
    return this.placements.recordLoyaltyReservation(placementId, reservation);
  }

  @WorkflowStep()
  private recordDiscountRedemptions(
    placementId: string,
    committed: CommittedDiscountUsage,
  ): Promise<void> {
    return this.placements.recordDiscountRedemptions(placementId, committed.redemptionIds);
  }

  private async compensateAndFail(
    placementId: string,
    cause: unknown,
    actions: ReadonlyArray<readonly [string, () => Promise<void>]>,
  ): Promise<void> {
    const failures = await this.runCompensations(actions);
    await this.failPlacement(
      placementId,
      {
        code: errorCode(cause),
        message: errorMessage(cause),
        retryable: isRetryable(cause),
      },
      failures,
    );
  }

  private async runCompensations(
    actions: ReadonlyArray<readonly [string, () => Promise<void>]>,
    recordedAt?: string,
  ): Promise<CheckoutCompensationFailure[]> {
    const failures: CheckoutCompensationFailure[] = [];
    for (const [operation, compensate] of actions) {
      try {
        await compensate();
      } catch (error) {
        compensationFailures.inc({ operation });
        failures.push({
          operation,
          message: errorMessage(error),
          // Finalization failures pass the exact eligibleAt so reconciliation can
          // reproduce the original idempotent request (loyalty commit hashes the
          // committedAt), instead of a drifted "now" that would be rejected.
          recordedAt: recordedAt ?? new Date(await DBOS.now()).toISOString(),
        });
      }
    }
    return failures;
  }

  @WorkflowStep()
  private recordCompensationFailures(
    placementId: string,
    failures: readonly CheckoutCompensationFailure[],
  ): Promise<void> {
    return this.placements.recordCompensationFailures(placementId, failures);
  }

  @WorkflowStep()
  private failPlacement(
    placementId: string,
    failure: { code: string; message: string; retryable: boolean },
    compensationFailures: readonly CheckoutCompensationFailure[],
  ): Promise<void> {
    return this.placements.fail(placementId, failure, compensationFailures);
  }
}

class LoyaltyReservationFailure extends Error {
  constructor(
    readonly original: unknown,
    readonly reservation: LoyaltyReservation,
  ) {
    super(errorMessage(original));
    this.name = "LoyaltyReservationFailure";
  }
}

export function placeOrderRequestHash(input: PlaceOrderWorkflowInput): string {
  return canonicalJsonSha256({
    organizationId: input.organizationId,
    storeId: input.storeId,
    checkoutId: input.checkoutId,
    expectedResultRevision: input.expectedResultRevision,
    credentialId: input.credentialId,
    visitorId: input.visitorId,
    userId: input.userId,
    returnUrl: input.returnUrl,
  });
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
  for (const [field, value] of [
    ["expectedResultRevision", input.expectedResultRevision],
    ["idempotencyKey", input.idempotencyKey],
    ["credentialId", input.credentialId],
    ["visitorId", input.visitorId],
  ] as const) {
    if (value.trim().length === 0) {
      throw new Error(`PLACE_ORDER_${field.toUpperCase()}_INVALID`);
    }
  }
  if (
    input.expectedResultRevision.length > 256 ||
    input.idempotencyKey.length > 200 ||
    input.credentialId.length > 256 ||
    input.visitorId.length > 128 ||
    input.correlationId.length > 255
  ) {
    throw new Error("PLACE_ORDER_INPUT_TOO_LONG");
  }
  if (input.returnUrl !== null) {
    assertAllowedCheckoutReturnUrl(input.returnUrl);
  }
}

function publicPlaceOrderInput(input: PlaceOrderWorkflowInput): PlaceOrderWorkflowInput {
  const { recoveryOfWorkflowId: _recoveryOfWorkflowId, ...request } = input;
  return request;
}

function paymentMonitorInput(
  input: PlaceOrderWorkflowInput,
  snapshot: PlaceOrderSnapshot,
  result: PlaceOrderWorkflowResult,
  sessionParams: Payments.CreatePaymentSessionParams,
  committedDiscounts: CommittedDiscountUsage,
  loyalty: LoyaltyReservation | null,
  deliveryCommitments: readonly Delivery.DeliveryCommittedGroupSnapshot[],
): import("./MonitorPlacedPaymentWorkflow.js").MonitorPlacedPaymentInput {
  return {
    organizationId: input.organizationId,
    storeId: input.storeId,
    placementId: snapshot.placementId,
    orderId: result.orderId,
    initialResult: result,
    sessionParams,
    redemptionIds: committedDiscounts.redemptionIds,
    loyaltyReservation: loyalty,
    deliveryGroupIds: deliveryCommitments.map((commitment) => commitment.groupId),
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId,
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string"
    ? error.code
    : errorMessage(error).split(":", 1)[0] || "CHECKOUT_PLACEMENT_FAILED";
}

function isRetryable(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "retryable" in error && error.retryable === true,
  );
}

function isPendingPaymentResult(result: PlaceOrderWorkflowResult): boolean {
  return (
    result.status === "REQUIRES_ACTION" ||
    result.status === "REQUIRES_CONFIRMATION" ||
    result.status === "PAYMENT_PENDING"
  );
}

function validateCheckoutSnapshot(
  checkout: CheckoutCommittedSnapshot,
  input: PlaceOrderWorkflowInput,
): void {
  if (checkout.lifecycle.status !== "READY") {
    throw new Error(`CHECKOUT_${checkout.lifecycle.status}`);
  }
  if (Date.parse(checkout.lifecycle.expiresAt) <= Date.now()) {
    throw new Error("CHECKOUT_EXPIRED");
  }
  if (
    checkout.storeId !== input.storeId ||
    checkout.checkoutId !== input.checkoutId ||
    checkout.result.resultRevision !== input.expectedResultRevision
  ) {
    throw new Error("CHECKOUT_PLACEMENT_SNAPSHOT_STALE");
  }
  assertCompletePipelineResult(checkout.result);
  if (checkout.result.validation.status !== "SUCCESS" || !checkout.result.validation.data.valid) {
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

function toPaymentBillingAddress(
  address: CheckoutCommittedSnapshot["draft"]["billingAddress"],
): Payments.PaymentProviderAddress | null {
  if (!address?.countryCode) return null;
  return {
    countryCode: address.countryCode,
    provinceCode: address.provinceCode,
    postalCode: address.postalCode,
    city: address.city,
    addressLine1: address.address1,
    addressLine2: address.address2,
  };
}

export function createOrderRewardEligibilitySnapshot(
  checkout: CheckoutCommittedSnapshot,
  eligibility: Readonly<{
    customerId: string;
    segmentIds: readonly string[];
    segmentMembershipRevision: string;
  }>,
): OrderLoyaltyRewardEligibilitySnapshot {
  if (checkout.result.finalPricing.status !== "SUCCESS") {
    throw new Error("CHECKOUT_FINAL_PRICING_REQUIRED_FOR_ORDER_REWARD");
  }
  if (checkout.draft.buyerIdentity?.customerId !== eligibility.customerId) {
    throw new Error("CHECKOUT_ORDER_REWARD_CUSTOMER_MISMATCH");
  }
  const quote = checkout.result.finalPricing.data;
  const discountClasses = new Map(
    quote.appliedDiscounts.map((application) => [
      application.applicationId,
      application.discountClass,
    ]),
  );
  const lines = flattenRewardLines(quote.lines)
    .filter(({ contributesToTotals }) => contributesToTotals)
    .map((line) => {
      const productDiscount = line.discountAllocations
        .filter(({ applicationId }) => discountClasses.get(applicationId) === "PRODUCT")
        .reduce((total, allocation) => total + BigInt(allocation.amount.amountMinor), 0n);
      return {
        orderLineId: line.lineId,
        productId: line.merchandise.targeting.productId,
        variantId: line.merchandise.variantId,
        categoryIds: line.merchandise.targeting.categoryIds,
        tagIds: line.merchandise.targeting.tagIds,
        featureIds: line.merchandise.targeting.featureIds,
        optionValueIds: line.merchandise.targeting.optionValueIds,
        quantity: line.quantity,
        eligibleAmountAfterProductDiscountsMinor: (
          BigInt(line.subtotal.amountMinor) - productDiscount
        ).toString(),
        eligibleAmountAfterAllDiscountsMinor: line.total.amountMinor,
      };
    });
  const eligibleAmountAfterProductDiscountsMinor = lines
    .reduce((total, line) => total + BigInt(line.eligibleAmountAfterProductDiscountsMinor), 0n)
    .toString();
  const eligibleAmountAfterAllDiscountsMinor = lines
    .reduce((total, line) => total + BigInt(line.eligibleAmountAfterAllDiscountsMinor), 0n)
    .toString();
  return {
    customerId: eligibility.customerId,
    currencyCode: quote.currencyCode,
    channelCode: checkout.draft.channelCode,
    customerEligibilityRevision: eligibility.segmentMembershipRevision,
    segmentIds: eligibility.segmentIds,
    segmentMembershipRevision: eligibility.segmentMembershipRevision,
    eligibleAmountAfterProductDiscountsMinor,
    eligibleAmountAfterAllDiscountsMinor,
    pricingQuoteId: quote.quoteId,
    pricingQuoteRevision: quote.revision,
    lines,
  };
}

function flattenRewardLines(
  lines: readonly Pricing.PricingCheckoutQuotedLine[],
): Pricing.PricingCheckoutQuotedLine[] {
  return lines.flatMap((line) => [line, ...flattenRewardLines(line.children)]);
}

function reservationDeadline(
  pointQuoteExpiresAt: string | null,
  rewardExpiresAt: string | null,
): string {
  const fallback = new Date(Date.now() + 60 * 60_000).toISOString();
  const deadlines = [pointQuoteExpiresAt, rewardExpiresAt, fallback].filter(
    (value): value is string => value !== null,
  );
  return deadlines.reduce((earliest, value) =>
    Date.parse(value) < Date.parse(earliest) ? value : earliest,
  );
}

function toPlaceOrderResult(
  placementId: string,
  orderId: string,
  accepted: Payments.CreatePaymentSessionResult,
  session: Payments.PaymentSessionSnapshot,
): PlaceOrderWorkflowResult {
  const status: PlaceOrderStatus =
    session.state === "CAPTURED"
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
