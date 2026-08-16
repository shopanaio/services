import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";

export class LedgerLoader {
  readonly transaction;
  readonly entry;
  readonly entriesByTransaction;
  readonly pointLot;
  readonly allocation;
  readonly allocationsByLot;
  readonly allocationsByTransaction;

  constructor(repository: Repository) {
    this.transaction = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.ledger.getTransactionsByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.entry = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.ledger.getEntriesByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.entriesByTransaction = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.ledger.listEntriesForTransactions(ids);
      const grouped = new Map<string, typeof rows>();
      for (const row of rows) grouped.set(row.transactionId, [...(grouped.get(row.transactionId) ?? []), row]);
      return ids.map((id) => grouped.get(id) ?? []);
    });
    this.pointLot = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.ledger.getPointLotsByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.allocation = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.ledger.getLotAllocationsByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.allocationsByLot = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.ledger.listLotAllocations(ids);
      const grouped = new Map<string, typeof rows>();
      for (const row of rows) grouped.set(row.lotId, [...(grouped.get(row.lotId) ?? []), row]);
      return ids.map((id) => grouped.get(id) ?? []);
    });
    this.allocationsByTransaction = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.ledger.listLotAllocationsForTransactions(ids);
      const grouped = new Map<string, typeof rows>();
      for (const row of rows) grouped.set(row.transactionId, [...(grouped.get(row.transactionId) ?? []), row]);
      return ids.map((id) => grouped.get(id) ?? []);
    });
  }
}
