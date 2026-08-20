import { Injectable } from "@nestjs/common";
import type {
  LoyaltyPointsEarnedEvent,
  LoyaltyPointsRestoredEvent,
  LoyaltyPointsReversedEvent,
  OrderRewardEligibleEvent,
  OrderRewardReversedEvent,
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
import { OrderRewardService } from "../application/earning/OrderRewardService.js";
import { runWithContext, ServiceContext } from "../context/index.js";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";
import type { Account, LoyaltyTransaction } from "../repositories/models/index.js";

type GetStoreByIdResult = {
  store: ContextStore | null;
  userErrors: readonly { message: string }[];
};
type EligibleResult = { transactionId: string; accountId: string };
type ReversedResult = {
  earningReversalTransactionId: string | null;
  redemptionRestoreTransactionIds: readonly string[];
  debtPoints: string;
};
type Emission = {
  eventType: string;
  payload: Record<string, unknown>;
  accountId: string;
  callId: string;
};

abstract class OrderRewardWorkflowBase<TInput, TOutput> extends BrokerWorkflows<TInput, TOutput> {
  protected constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected get kernel(): Kernel {
    return Kernel.getInstance();
  }

  protected async withStore<T>(
    storeId: string,
    requestId: string,
    work: (store: ContextStore) => Promise<T>,
  ) {
    const result = await this.broker.call<GetStoreByIdResult, { id: string }>(
      "project.getStoreById",
      { id: storeId },
    );
    if (!result.store)
      throw new Error(result.userErrors[0]?.message ?? `Store ${storeId} was not found`);
    const store = result.store;
    const value = await runWithContext(
      new ServiceContext({
        requestId,
        kernel: this.kernel,
        loaders: new Loader(this.kernel.repository),
        store,
        locale: store.defaultLocale,
        currency: store.currencyCode,
      }),
      () => work(store),
    );
    return { value, store };
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
}

@Injectable()
export class OrderRewardEligibleWorkflow extends OrderRewardWorkflowBase<
  OrderRewardEligibleEvent,
  EligibleResult | null
> {
  constructor(@InjectBroker("loyalty") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("processOrderRewardEligible")
  async run(input: OrderRewardEligibleEvent): Promise<EligibleResult | null> {
    const executed = await this.stepEarn(input);
    for (const emission of executed.emissions) await this.emit(executed.store, emission);
    return executed.result;
  }

  @WorkflowStep()
  private async stepEarn(input: OrderRewardEligibleEvent) {
    const executed = await this.withStore(input.payload.storeId, input.eventId, async () => {
      const result = await new OrderRewardService(this.kernel.repository).earn(input);
      const program = await this.kernel.repository.program.findDefault();
      const account = result
        ? await this.kernel.repository.account.findById(result.accountId)
        : program
          ? await this.kernel.repository.account.findByCustomerAndProgram(
              input.payload.customerId,
              program.id,
            )
          : null;
      if (result && !account) throw new Error("Earned points account audit is incomplete");
      const emissions: Emission[] = [];
      const emittedTransactions = new Set<string>();
      if (result && account) {
        const transaction = await this.kernel.repository.ledger.findTransactionById(
          result.transactionId,
        );
        if (!transaction?.programVersionId) throw new Error("Earned points audit is incomplete");
        emissions.push(
          this.earnedEmission(
            input,
            account,
            transaction,
            String(transaction.metadata.awardedPoints ?? "0"),
          ),
        );
        emittedTransactions.add(transaction.id);
      }
      const fact = await this.kernel.repository.event.findFactByExternalId(
        input.source,
        input.eventId,
      );
      if (fact && account) {
        const evaluations = await this.kernel.repository.event.listEvaluations(fact.id, account.id);
        for (const evaluation of evaluations) {
          if (
            !evaluation.transactionId ||
            !evaluation.pointsAwarded ||
            emittedTransactions.has(evaluation.transactionId)
          )
            continue;
          const transaction = await this.kernel.repository.ledger.findTransactionById(
            evaluation.transactionId,
          );
          if (!transaction?.programVersionId) continue;
          emissions.push(
            this.earnedEmission(input, account, transaction, evaluation.pointsAwarded.toString()),
          );
          emittedTransactions.add(transaction.id);
        }
      }
      return { result, emissions };
    });
    return { ...executed.value, store: executed.store };
  }

  private earnedEmission(
    input: OrderRewardEligibleEvent,
    account: Account,
    transaction: LoyaltyTransaction,
    points: string,
  ): Emission {
    const payload: LoyaltyPointsEarnedEvent["payload"] = {
      schemaVersion: 1,
      storeId: input.payload.storeId,
      programId: account.programId,
      programVersionId: transaction.programVersionId!,
      accountId: account.id,
      customerId: account.customerId,
      transactionId: transaction.id,
      points,
      occurredAt: input.payload.eligibleAt,
      orderId: input.payload.orderId,
      orderRevision: input.payload.orderRevision,
      activationAt: String(transaction.metadata.activationAt ?? transaction.effectiveAt),
      expiresAt:
        typeof transaction.metadata.expiresAt === "string" ? transaction.metadata.expiresAt : null,
    };
    return {
      eventType: "loyaltyPointsEarned",
      payload: payload as unknown as Record<string, unknown>,
      accountId: account.id,
      callId: transaction.id,
    };
  }
}

@Injectable()
export class OrderRewardReversedWorkflow extends OrderRewardWorkflowBase<
  OrderRewardReversedEvent,
  ReversedResult
> {
  constructor(@InjectBroker("loyalty") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("processOrderRewardReversed")
  async run(input: OrderRewardReversedEvent): Promise<ReversedResult> {
    const executed = await this.stepReverse(input);
    for (const emission of executed.emissions) await this.emit(executed.store, emission);
    return executed.result;
  }

  @WorkflowStep()
  private async stepReverse(input: OrderRewardReversedEvent) {
    const executed = await this.withStore(input.payload.storeId, input.eventId, async () => {
      const result = await new OrderRewardService(this.kernel.repository).reverse(input);
      const emissions: Emission[] = [];
      if (result.earningReversalTransactionId) {
        const representative = await this.kernel.repository.ledger.findTransactionById(
          result.earningReversalTransactionId,
        );
        const account = representative
          ? await this.kernel.repository.account.findById(representative.accountId)
          : null;
        const transactions = account
          ? (await this.kernel.repository.ledger.listAllTransactions(account.id)).filter(
              (transaction) =>
                transaction.kind === "REVERSE_EARN" && transaction.eventId === input.eventId,
            )
          : [];
        for (const transaction of transactions) {
          if (!transaction.programVersionId || !account) continue;
          const payload: LoyaltyPointsReversedEvent["payload"] = {
            schemaVersion: 1,
            storeId: input.payload.storeId,
            programId: account.programId,
            programVersionId: transaction.programVersionId,
            accountId: account.id,
            customerId: account.customerId,
            transactionId: transaction.id,
            points: String(transaction.metadata.points ?? "0"),
            occurredAt: input.payload.reversedAt,
            orderId: input.payload.orderId,
            sourceType: input.payload.sourceType,
            sourceId: input.payload.sourceId,
            debtPoints: String(transaction.metadata.debtPoints ?? "0"),
          };
          emissions.push({
            eventType: "loyaltyPointsReversed",
            payload: payload as unknown as Record<string, unknown>,
            accountId: account.id,
            callId: transaction.id,
          });
        }
      }
      for (const transactionId of result.redemptionRestoreTransactionIds) {
        const transaction = await this.kernel.repository.ledger.findTransactionById(transactionId);
        const account = transaction
          ? await this.kernel.repository.account.findById(transaction.accountId)
          : null;
        if (!transaction?.programVersionId || !account) continue;
        const payload: LoyaltyPointsRestoredEvent["payload"] = {
          schemaVersion: 1,
          storeId: input.payload.storeId,
          programId: account.programId,
          programVersionId: transaction.programVersionId,
          accountId: account.id,
          customerId: account.customerId,
          transactionId: transaction.id,
          points: String(transaction.metadata.points ?? "0"),
          occurredAt: input.payload.reversedAt,
          reservationId: String(transaction.metadata.reservationId),
          orderId: input.payload.orderId,
          sourceType: input.payload.sourceType,
          sourceId: input.payload.sourceId,
          expiresAt:
            typeof transaction.metadata.expiresAt === "string"
              ? transaction.metadata.expiresAt
              : null,
        };
        emissions.push({
          eventType: "loyaltyPointsRestored",
          payload: payload as unknown as Record<string, unknown>,
          accountId: account.id,
          callId: transaction.id,
        });
      }
      return { result, emissions };
    });
    return { ...executed.value, store: executed.store };
  }
}
