import DataLoader from "dataloader";
import type { Store } from "../repositories/store/StoreRepository.js";
import type { Repository } from "../repositories/Repository.js";
import type { StoreSettingsSnapshot } from "../repositories/storeSettings/StoreSettingsRepository.js";

export class StoreLoader {
  readonly store: DataLoader<string, Store | null>;
  readonly storeSettings: DataLoader<string, StoreSettingsSnapshot | null>;

  constructor(repository: Repository, storefrontStoreId?: string) {
    this.store = new DataLoader<string, Store | null>(async (ids) => {
      if (!storefrontStoreId) return ids.map(() => null);
      const scopedIds = ids.filter((id) => id === storefrontStoreId);
      const items = await repository.store.getByIds(scopedIds);
      return ids.map(
        (id) => items.find((item) => item.id === id) ?? null,
      );
    });

    this.storeSettings = new DataLoader<
      string,
      StoreSettingsSnapshot | null
    >(async (ids) =>
      Promise.all(
        ids.map((id) =>
          id === storefrontStoreId
            ? repository.storeSettings.findByStoreId(id)
            : Promise.resolve(null),
        ),
      ),
    );
  }
}
