import { Injectable } from "@nestjs/common";
import type {
  LoyaltyPointsActivatedEvent,
  LoyaltyPointsExpiredEvent,
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
import { PointsLedgerService } from "../application/ledger/PointsLedgerService.js";
import { ProgramLifecycleService } from "../application/program/ProgramLifecycleService.js";
import { RewardEntitlementService } from "../application/rewards/RewardEntitlementService.js";
import { TierEvaluationService } from "../application/tiers/TierEvaluationService.js";
import { MonetaryWalletService } from "../application/wallet/MonetaryWalletService.js";
import { LoyaltyDomainError } from "../application/errors.js";
import { CheckoutRedemptionService } from "../application/checkout/CheckoutRedemptionService.js";
import { runWithContext, ServiceContext } from "../context/index.js";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";

export interface LoyaltyMaintenanceInput {
  storeId: string;
  effectiveAt: string;
  organizationId?: string;
  limit?: number;
  rebuildBalances?: boolean;
}

export interface LoyaltyMaintenanceResult {
  activatedProgramVersions: number;
  expiredReservations: number;
  activatedPointLots: number;
  expiredPointLots: number;
  activatedMonetaryLots: number;
  expiredMonetaryLots: number;
  evaluatedTiers: number;
  expiredRewards: number;
  rebuiltBalances: number;
}

type GetStoreByIdResult = { store: ContextStore | null; userErrors: readonly { message: string }[] };
type Emission = { eventType: string; payload: Record<string, unknown>; accountId: string; transactionId: string };

@Injectable()
export class LoyaltyMaintenanceWorkflow extends BrokerWorkflows<
  LoyaltyMaintenanceInput,
  LoyaltyMaintenanceResult
> {
  constructor(@InjectBroker("loyalty") broker: ServiceBroker) { super(broker); }

  private get kernel(): Kernel { return Kernel.getInstance(); }

  @Workflow("maintenance")
  async run(input: LoyaltyMaintenanceInput): Promise<LoyaltyMaintenanceResult> {
    const executed = await this.stepMaintain(input);
    for (const emission of executed.emissions) await this.emit(executed.store, emission);
    return executed.result;
  }

  @WorkflowStep({ retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 } })
  private async stepMaintain(input: LoyaltyMaintenanceInput) {
    if (!Number.isFinite(Date.parse(input.effectiveAt))) {
      throw new LoyaltyDomainError("INVALID_MAINTENANCE_TIME", "Maintenance effectiveAt must be a valid timestamp");
    }
    const limit = input.limit ?? 100;
    if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 10_000) {
      throw new LoyaltyDomainError("INVALID_MAINTENANCE_LIMIT", "Maintenance limit must be between 1 and 10000");
    }
    const store = await this.getStore(input.storeId);
    const maintained = await runWithContext(new ServiceContext({
      requestId: `maintenance:${input.effectiveAt}`,
      kernel: this.kernel,
      loaders: new Loader(this.kernel.repository),
      store,
      locale: store.defaultLocale,
      currency: store.currencyCode,
    }), async () => {
      const repository = this.kernel.repository;
      const points = new PointsLedgerService(repository);
      const walletService = new MonetaryWalletService(repository);
      const expiredReservations = await new CheckoutRedemptionService(repository).expire({
        storeId: input.storeId,
        effectiveAt: input.effectiveAt,
        limit,
      });
      const activatedVersions = await new ProgramLifecycleService(repository).activateScheduled(
        input.effectiveAt,
        limit,
      );
      const accounts = await repository.account.listAllForStore();
      const emissions: Emission[] = [];
      let activatedPointLots = 0;
      let expiredPointLots = 0;
      let activatedMonetaryLots = 0;
      let expiredMonetaryLots = 0;
      let evaluatedTiers = 0;
      let rebuiltBalances = 0;
      for (const account of accounts) {
        if (account.status !== "ACTIVE") continue;
        const activated = await points.activateDueLots(account, input.effectiveAt);
        const expired = await points.expireLots(account, input.effectiveAt);
        activatedPointLots += activated.length;
        expiredPointLots += expired.length;
        for (const operation of activated) {
          if (!operation.transaction.programVersionId) continue;
          const pointCount = operation.entries.find(({ bucket, pointsDelta }) => bucket === "AVAILABLE" && pointsDelta > 0n)?.pointsDelta ?? 0n;
          const payload: LoyaltyPointsActivatedEvent["payload"] = {
            schemaVersion: 1,
            storeId: account.storeId,
            programId: account.programId,
            programVersionId: operation.transaction.programVersionId,
            accountId: account.id,
            customerId: account.customerId,
            transactionId: operation.transaction.id,
            points: pointCount.toString(),
            occurredAt: input.effectiveAt,
            lotIds: [String(operation.transaction.metadata.lotId)],
          };
          emissions.push({ eventType: "loyaltyPointsActivated", payload: payload as unknown as Record<string, unknown>, accountId: account.id, transactionId: operation.transaction.id });
        }
        for (const operation of expired) {
          if (!operation.transaction.programVersionId) continue;
          const pointCount = operation.entries.find(({ pointsDelta }) => pointsDelta < 0n)?.pointsDelta ?? 0n;
          const payload: LoyaltyPointsExpiredEvent["payload"] = {
            schemaVersion: 1,
            storeId: account.storeId,
            programId: account.programId,
            programVersionId: operation.transaction.programVersionId,
            accountId: account.id,
            customerId: account.customerId,
            transactionId: operation.transaction.id,
            points: (-pointCount).toString(),
            occurredAt: input.effectiveAt,
            lotIds: [String(operation.transaction.metadata.lotId)],
          };
          emissions.push({ eventType: "loyaltyPointsExpired", payload: payload as unknown as Record<string, unknown>, accountId: account.id, transactionId: operation.transaction.id });
        }
        const programVersion = await repository.program.findEffectiveVersion(account.programId, input.effectiveAt);
        if (programVersion) {
          await new TierEvaluationService(repository).evaluate({
            account,
            programVersionId: programVersion.id,
            effectiveAt: input.effectiveAt,
            reasonCode: "SCHEDULED_REEVALUATION",
          });
          evaluatedTiers += 1;
        }
        for (const wallet of await repository.wallet.listForAccount(account.id)) {
          if (wallet.status !== "ACTIVE") continue;
          activatedMonetaryLots += (await walletService.activateDue(wallet, input.effectiveAt)).length;
          expiredMonetaryLots += (await walletService.expireWallet(wallet, input.effectiveAt)).length;
          if (input.rebuildBalances) {
            await walletService.rebuildBalance(wallet.id);
            rebuiltBalances += 1;
          }
        }
        if (input.rebuildBalances) {
          await points.rebuildBalance(account.id);
          rebuiltBalances += 1;
        }
      }
      const expiredRewards = await new RewardEntitlementService(repository).expireDue(
        input.effectiveAt,
        limit,
      );
      return {
        result: {
          activatedProgramVersions: activatedVersions.length,
          expiredReservations: expiredReservations.expired.length,
          activatedPointLots,
          expiredPointLots,
          activatedMonetaryLots,
          expiredMonetaryLots,
          evaluatedTiers,
          expiredRewards: expiredRewards.length,
          rebuiltBalances,
        },
        emissions,
      };
    });
    return { ...maintained, store };
  }

  private async emit(store: ContextStore, emission: Emission): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: emission.eventType,
        payload: emission.payload,
        context: { organizationId: store.organizationId },
        subject: { type: "loyaltyAccount", id: emission.accountId },
        actor: { type: "system" },
        emitKey: `loyalty-account:${emission.accountId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: `emit:${emission.eventType}`,
        callId: emission.transactionId,
        organizationId: store.organizationId,
      },
    );
  }

  private async getStore(storeId: string): Promise<ContextStore> {
    const result = await this.broker.call<GetStoreByIdResult, { id: string }>("project.getStoreById", { id: storeId });
    if (!result.store) throw new Error(result.userErrors[0]?.message ?? `Store ${storeId} was not found`);
    return result.store;
  }
}
