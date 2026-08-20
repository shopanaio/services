import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";

function byId<T extends { id: string }>(rows: readonly T[], ids: readonly string[]) {
  const map = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => map.get(id) ?? null);
}

function grouped<T>(rows: readonly T[], key: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) map.set(key(row), [...(map.get(key(row)) ?? []), row]);
  return map;
}

export class AdminDomainLoader {
  readonly eventFact;
  readonly eventEvaluation;
  readonly eventEvaluationsByFact;
  readonly earningRuleUsageById;
  readonly rewardEntitlementEvent;
  readonly rewardEntitlementEvents;
  readonly tierRewardBenefit;
  readonly tierRewardBenefits;
  readonly monetaryWallet;
  readonly monetaryWalletBalance;
  readonly monetaryTransaction;
  readonly monetaryEntries;
  readonly monetaryEntry;
  readonly monetaryCreditLot;
  readonly monetaryCreditLots;
  readonly monetaryLotAllocation;
  readonly monetaryLotAllocations;

  constructor(repository: Repository) {
    this.eventFact = new DataLoader(async (ids: readonly string[]) =>
      byId(await repository.event.getFactsByIds(ids), ids),
    );
    this.eventEvaluation = new DataLoader(async (ids: readonly string[]) =>
      byId(await repository.event.getEvaluationsByIds(ids), ids),
    );
    this.eventEvaluationsByFact = new DataLoader(async (ids: readonly string[]) => {
      const rows = grouped(
        await repository.event.getEvaluationsByFactIds(ids),
        (row) => row.eventFactId,
      );
      return ids.map((id) => rows.get(id) ?? []);
    });
    this.earningRuleUsageById = new DataLoader(async (ids: readonly string[]) =>
      byId(await repository.event.getUsagesByIds(ids), ids),
    );
    this.rewardEntitlementEvent = new DataLoader(async (ids: readonly string[]) =>
      byId(await repository.reward.getEntitlementEventsByIds(ids), ids),
    );
    this.rewardEntitlementEvents = new DataLoader(async (ids: readonly string[]) => {
      const rows = grouped(
        await repository.reward.getEntitlementEventsByEntitlementIds(ids),
        (row) => row.entitlementId,
      );
      return ids.map((id) => rows.get(id) ?? []);
    });
    this.tierRewardBenefit = new DataLoader(async (ids: readonly string[]) =>
      byId(await repository.reward.getTierBenefitsByIds(ids), ids),
    );
    this.tierRewardBenefits = new DataLoader(async (ids: readonly string[]) => {
      const rows = grouped(
        await repository.reward.getTierBenefitsByTierIds(ids),
        (row) => row.tierId,
      );
      return ids.map((id) => rows.get(id) ?? []);
    });
    this.monetaryWallet = new DataLoader(async (ids: readonly string[]) =>
      byId(await repository.wallet.getWalletsByIds(ids), ids),
    );
    this.monetaryWalletBalance = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.wallet.getBalancesByWalletIds(ids);
      const map = new Map(rows.map((row) => [row.walletId, row]));
      return ids.map((id) => map.get(id) ?? null);
    });
    this.monetaryTransaction = new DataLoader(async (ids: readonly string[]) =>
      byId(await repository.wallet.getTransactionsByIds(ids), ids),
    );
    this.monetaryEntry = new DataLoader(async (ids: readonly string[]) =>
      byId(await repository.wallet.getEntriesByIds(ids), ids),
    );
    this.monetaryEntries = new DataLoader(async (ids: readonly string[]) => {
      const rows = grouped(
        await repository.wallet.getEntriesByTransactionIds(ids),
        (row) => row.transactionId,
      );
      return ids.map((id) => rows.get(id) ?? []);
    });
    this.monetaryCreditLot = new DataLoader(async (ids: readonly string[]) =>
      byId(await repository.wallet.getCreditLotsByIds(ids), ids),
    );
    this.monetaryCreditLots = new DataLoader(async (ids: readonly string[]) => {
      const rows = grouped(
        await repository.wallet.getCreditLotsByWalletIds(ids),
        (row) => row.walletId,
      );
      return ids.map((id) => rows.get(id) ?? []);
    });
    this.monetaryLotAllocation = new DataLoader(async (ids: readonly string[]) =>
      byId(await repository.wallet.getLotAllocationsByIds(ids), ids),
    );
    this.monetaryLotAllocations = new DataLoader(async (ids: readonly string[]) => {
      const rows = grouped(
        await repository.wallet.getLotAllocationsByLotIds(ids),
        (row) => row.lotId,
      );
      return ids.map((id) => rows.get(id) ?? []);
    });
  }
}
