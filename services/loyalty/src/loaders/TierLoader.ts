import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";

export class TierLoader {
  readonly tier;
  readonly membership;
  readonly membershipEvent;
  readonly membershipEvents;

  constructor(repository: Repository) {
    this.tier = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.tier.getTiersByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.membership = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.tier.getMembershipsByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.membershipEvent = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.tier.getMembershipEventsByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.membershipEvents = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.tier.getMembershipEventsByMembershipIds(ids);
      const grouped = new Map<string, typeof rows>();
      for (const row of rows) grouped.set(row.membershipId, [...(grouped.get(row.membershipId) ?? []), row]);
      return ids.map((id) => grouped.get(id) ?? []);
    });
  }
}
