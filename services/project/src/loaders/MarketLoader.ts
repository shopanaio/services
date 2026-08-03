import DataLoader from "dataloader";
import type { MarketSnapshot } from "../repositories/market/MarketRepository.js";
import type { Repository } from "../repositories/Repository.js";

export class MarketLoader {
  readonly market: DataLoader<string, MarketSnapshot | null>;

  constructor(repository: Repository, storefrontStoreId?: string) {
    this.market = new DataLoader<string, MarketSnapshot | null>(async (ids) => {
      if (!storefrontStoreId) return ids.map(() => null);
      const snapshots = await repository.market.getSnapshotsByIds(
        storefrontStoreId,
        ids,
      );
      return ids.map(
        (id) => snapshots.find(({ market }) => market.id === id) ?? null,
      );
    });
  }
}
