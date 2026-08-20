import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";

export class AccountLoader {
  readonly account;
  readonly balance;
  readonly activeTierMembership;
  readonly expiringPoints;

  constructor(repository: Repository) {
    this.account = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.account.getByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.balance = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.balance.getByAccountIds(ids);
      const byId = new Map(rows.map((row) => [row.accountId, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.activeTierMembership = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.tier.getActiveMembershipsByAccountIds(ids);
      const byId = new Map(rows.map((row) => [row.accountId, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.expiringPoints = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.balance.listExpiringPointsForAccounts(ids);
      const grouped = new Map<string, typeof rows>();
      for (const row of rows)
        grouped.set(row.accountId, [...(grouped.get(row.accountId) ?? []), row]);
      return ids.map((id) => grouped.get(id) ?? []);
    });
  }
}
