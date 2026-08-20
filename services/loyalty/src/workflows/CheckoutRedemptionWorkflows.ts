import { Injectable } from "@nestjs/common";
import type {
  LoyaltyPointsRedeemedEvent,
  LoyaltyPointsReleasedEvent,
  LoyaltyPointsReservedEvent,
  LoyaltyPointsRestoredEvent,
} from "@shopana/events";
import type { ContextStore } from "@shopana/shared-context";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  type ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import type {
  CommitCheckoutLoyaltyRedemptionParams,
  CommitCheckoutLoyaltyRedemptionResult,
  ExpireCheckoutLoyaltyRedemptionsParams,
  ExpireCheckoutLoyaltyRedemptionsResult,
  ReleaseCheckoutLoyaltyRedemptionParams,
  ReleaseCheckoutLoyaltyRedemptionResult,
  ReserveCheckoutLoyaltyRedemptionParams,
  ReserveCheckoutLoyaltyRedemptionResult,
  ReverseCheckoutLoyaltyRedemptionParams,
  ReverseCheckoutLoyaltyRedemptionResult,
} from "@shopana/broker-types";
import { CheckoutRedemptionService } from "../application/checkout/CheckoutRedemptionService.js";
import { runWithContext, ServiceContext } from "../context/index.js";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";

type GetStoreByIdResult = {
  store: ContextStore | null;
  userErrors: readonly { message: string }[];
};
type Emission = {
  eventType: string;
  payload: Record<string, unknown>;
  accountId: string;
  callId: string;
};

abstract class CheckoutWorkflowBase<TInput, TOutput> extends BrokerWorkflows<TInput, TOutput> {
  protected constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected get kernel(): Kernel {
    return Kernel.getInstance();
  }

  protected async executeWithStore<T>(storeId: string, requestId: string, work: () => Promise<T>) {
    const store = await this.getStore(storeId);
    const result = await runWithContext(
      new ServiceContext({
        requestId,
        kernel: this.kernel,
        loaders: new Loader(this.kernel.repository),
        store,
        locale: store.defaultLocale,
        currency: store.currencyCode,
      }),
      work,
    );
    return { result, store };
  }

  protected async emit(store: ContextStore, emission: Emission): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: emission.eventType,
        payload: emission.payload,
        context: { organizationId: store.organizationId },
        subject: { type: "loyaltyAccount", id: emission.accountId },
        actor: { type: "service", id: "loyalty" },
        emitKey: `loyalty-account:${emission.accountId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: `emit:${emission.eventType}`,
        callId: emission.callId,
        organizationId: store.organizationId,
      },
    );
  }

  private async getStore(storeId: string): Promise<ContextStore> {
    const result = await this.broker.call<GetStoreByIdResult, { id: string }>(
      "project.getStoreById",
      { id: storeId },
    );
    if (!result.store)
      throw new Error(result.userErrors[0]?.message ?? `Store ${storeId} was not found`);
    return result.store;
  }
}

@Injectable()
export class ReserveRedemptionWorkflow extends CheckoutWorkflowBase<
  ReserveCheckoutLoyaltyRedemptionParams,
  ReserveCheckoutLoyaltyRedemptionResult
> {
  constructor(@InjectBroker("loyalty") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("reserveCheckoutLoyaltyRedemption")
  async run(
    input: ReserveCheckoutLoyaltyRedemptionParams,
  ): Promise<ReserveCheckoutLoyaltyRedemptionResult> {
    const executed = await this.stepExecute(input);
    if (executed.emission) await this.emit(executed.store, executed.emission);
    return executed.result;
  }

  @WorkflowStep()
  private async stepExecute(input: ReserveCheckoutLoyaltyRedemptionParams) {
    const executed = await this.executeWithStore(input.context.storeId, input.idempotencyKey, () =>
      new CheckoutRedemptionService(this.kernel.repository).reserve(input),
    );
    const result = executed.result;
    if (result.status !== "RESERVED") return { ...executed, emission: null };
    if (!input.context.customerId) {
      throw new Error("A customer is required for a loyalty reservation");
    }
    const payload: LoyaltyPointsReservedEvent["payload"] = {
      schemaVersion: 1,
      storeId: input.context.storeId,
      programId: input.quote.program.programId,
      programVersionId: input.quote.program.programVersionId,
      accountId: result.accountId,
      customerId: input.context.customerId,
      transactionId: result.transactionId,
      points: result.points,
      occurredAt: input.context.requestedAt,
      reservationId: result.reservationId,
      checkoutId: input.context.checkoutId,
      checkoutVersion: input.context.checkoutVersion,
      discountAmountMinor: result.discount.amountMinor,
      currencyCode: result.discount.currencyCode,
      expiresAt: result.expiresAt,
    };
    return {
      ...executed,
      emission: {
        eventType: "loyaltyPointsReserved",
        payload: payload as unknown as Record<string, unknown>,
        accountId: result.accountId,
        callId: result.reservationId,
      },
    };
  }
}

@Injectable()
export class CommitRedemptionWorkflow extends CheckoutWorkflowBase<
  CommitCheckoutLoyaltyRedemptionParams,
  CommitCheckoutLoyaltyRedemptionResult
> {
  constructor(@InjectBroker("loyalty") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("commitCheckoutLoyaltyRedemption")
  async run(
    input: CommitCheckoutLoyaltyRedemptionParams,
  ): Promise<CommitCheckoutLoyaltyRedemptionResult> {
    const executed = await this.stepExecute(input);
    if (executed.emission) await this.emit(executed.store, executed.emission);
    return executed.result;
  }

  @WorkflowStep()
  private async stepExecute(input: CommitCheckoutLoyaltyRedemptionParams) {
    return this.executeWithStore(input.storeId, input.idempotencyKey, async () => {
      const result = await new CheckoutRedemptionService(this.kernel.repository).commit(input);
      if (result.status !== "COMMITTED") return { result, emission: null };
      const reservation = await this.kernel.repository.reservation.findById(result.reservationId);
      const account = reservation
        ? await this.kernel.repository.account.findById(reservation.accountId)
        : null;
      if (!reservation || !account)
        throw new Error("Committed loyalty reservation audit is missing");
      const payload: LoyaltyPointsRedeemedEvent["payload"] = {
        schemaVersion: 1,
        storeId: input.storeId,
        programId: reservation.programId,
        programVersionId: reservation.programVersionId,
        accountId: account.id,
        customerId: account.customerId,
        transactionId: result.redemptionTransactionId,
        points: result.points,
        occurredAt: result.committedAt,
        reservationId: reservation.id,
        checkoutId: reservation.checkoutId,
        orderId: input.orderId,
        orderRevision: input.orderRevision,
        discountAmountMinor: result.discount.amountMinor,
        currencyCode: result.discount.currencyCode,
      };
      return {
        result,
        emission: {
          eventType: "loyaltyPointsRedeemed",
          payload: payload as unknown as Record<string, unknown>,
          accountId: account.id,
          callId: reservation.id,
        },
      };
    }).then(({ result: nested, store }) => ({ ...nested, store }));
  }
}

@Injectable()
export class ReleaseRedemptionWorkflow extends CheckoutWorkflowBase<
  ReleaseCheckoutLoyaltyRedemptionParams,
  ReleaseCheckoutLoyaltyRedemptionResult
> {
  constructor(@InjectBroker("loyalty") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("releaseCheckoutLoyaltyRedemption")
  async run(
    input: ReleaseCheckoutLoyaltyRedemptionParams,
  ): Promise<ReleaseCheckoutLoyaltyRedemptionResult> {
    const executed = await this.stepExecute(input);
    if (executed.emission) await this.emit(executed.store, executed.emission);
    return executed.result;
  }

  @WorkflowStep()
  private async stepExecute(input: ReleaseCheckoutLoyaltyRedemptionParams) {
    return this.executeWithStore(input.storeId, input.idempotencyKey, async () => {
      const result = await new CheckoutRedemptionService(this.kernel.repository).release(input);
      if (result.status !== "RELEASED") return { result, emission: null };
      const reservation = await this.kernel.repository.reservation.findById(result.reservationId);
      const account = reservation
        ? await this.kernel.repository.account.findById(reservation.accountId)
        : null;
      if (!reservation || !account)
        throw new Error("Released loyalty reservation audit is missing");
      const payload: LoyaltyPointsReleasedEvent["payload"] = {
        schemaVersion: 1,
        storeId: input.storeId,
        programId: reservation.programId,
        programVersionId: reservation.programVersionId,
        accountId: account.id,
        customerId: account.customerId,
        transactionId: result.releaseTransactionId,
        points: result.points,
        occurredAt: result.releasedAt,
        reservationId: reservation.id,
        checkoutId: reservation.checkoutId,
        reasonCode: input.reason,
      };
      return {
        result,
        emission: {
          eventType: "loyaltyPointsReleased",
          payload: payload as unknown as Record<string, unknown>,
          accountId: account.id,
          callId: reservation.id,
        },
      };
    }).then(({ result: nested, store }) => ({ ...nested, store }));
  }
}

@Injectable()
export class ExpireRedemptionsWorkflow extends CheckoutWorkflowBase<
  ExpireCheckoutLoyaltyRedemptionsParams,
  ExpireCheckoutLoyaltyRedemptionsResult
> {
  constructor(@InjectBroker("loyalty") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("expireCheckoutLoyaltyRedemptions")
  async run(
    input: ExpireCheckoutLoyaltyRedemptionsParams,
  ): Promise<ExpireCheckoutLoyaltyRedemptionsResult> {
    const executed = await this.stepExecute(input);
    for (const emission of executed.emissions) await this.emit(executed.store, emission);
    return executed.result;
  }

  @WorkflowStep()
  private async stepExecute(input: ExpireCheckoutLoyaltyRedemptionsParams) {
    return this.executeWithStore(input.storeId, `expire:${input.effectiveAt}`, async () => {
      const result = await new CheckoutRedemptionService(this.kernel.repository).expire(input);
      const emissions: Emission[] = [];
      for (const expired of result.expired) {
        const reservation = await this.kernel.repository.reservation.findById(
          expired.reservationId,
        );
        const account = reservation
          ? await this.kernel.repository.account.findById(reservation.accountId)
          : null;
        if (!reservation || !account) continue;
        const payload: LoyaltyPointsReleasedEvent["payload"] = {
          schemaVersion: 1,
          storeId: input.storeId,
          programId: reservation.programId,
          programVersionId: reservation.programVersionId,
          accountId: account.id,
          customerId: account.customerId,
          transactionId: expired.releaseTransactionId,
          points: expired.points,
          occurredAt: input.effectiveAt,
          reservationId: reservation.id,
          checkoutId: reservation.checkoutId,
          reasonCode: "RESERVATION_EXPIRED",
        };
        emissions.push({
          eventType: "loyaltyPointsReleased",
          payload: payload as unknown as Record<string, unknown>,
          accountId: account.id,
          callId: reservation.id,
        });
      }
      return { result, emissions };
    }).then(({ result: nested, store }) => ({ ...nested, store }));
  }
}

@Injectable()
export class ReverseRedemptionWorkflow extends CheckoutWorkflowBase<
  ReverseCheckoutLoyaltyRedemptionParams,
  ReverseCheckoutLoyaltyRedemptionResult
> {
  constructor(@InjectBroker("loyalty") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("reverseCheckoutLoyaltyRedemption")
  async run(
    input: ReverseCheckoutLoyaltyRedemptionParams,
  ): Promise<ReverseCheckoutLoyaltyRedemptionResult> {
    const executed = await this.stepExecute(input);
    if (executed.emission) await this.emit(executed.store, executed.emission);
    return executed.result;
  }

  @WorkflowStep()
  private async stepExecute(input: ReverseCheckoutLoyaltyRedemptionParams) {
    return this.executeWithStore(input.storeId, input.idempotencyKey, async () => {
      const result = await new CheckoutRedemptionService(this.kernel.repository).reverse(input);
      if (result.status !== "REVERSED") return { result, emission: null };
      const reservation = await this.kernel.repository.reservation.findById(result.reservationId);
      const account = reservation
        ? await this.kernel.repository.account.findById(reservation.accountId)
        : null;
      if (!reservation || !account)
        throw new Error("Reversed loyalty reservation audit is missing");
      const transaction = await this.kernel.repository.ledger.findTransactionById(
        result.restoreTransactionId,
      );
      const payload: LoyaltyPointsRestoredEvent["payload"] = {
        schemaVersion: 1,
        storeId: input.storeId,
        programId: reservation.programId,
        programVersionId: reservation.programVersionId,
        accountId: account.id,
        customerId: account.customerId,
        transactionId: result.restoreTransactionId,
        points: result.points,
        occurredAt: input.occurredAt,
        reservationId: reservation.id,
        orderId: input.orderId,
        sourceType: "REFUND",
        sourceId: input.refundId,
        expiresAt:
          typeof transaction?.metadata.expiresAt === "string"
            ? transaction.metadata.expiresAt
            : null,
      };
      return {
        result,
        emission: {
          eventType: "loyaltyPointsRestored",
          payload: payload as unknown as Record<string, unknown>,
          accountId: account.id,
          callId: `${reservation.id}:${input.refundId}`,
        },
      };
    }).then(({ result: nested, store }) => ({ ...nested, store }));
  }
}
