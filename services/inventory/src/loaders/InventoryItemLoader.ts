import DataLoader from "dataloader";
import type { InventoryItem } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class InventoryItemLoader {
  public readonly inventoryItem: DataLoader<string, InventoryItem | null>;
  public readonly inventoryItemByVariant: DataLoader<string, InventoryItem | null>;

  constructor(repository: Repository) {
    // Load by inventory item ID
    this.inventoryItem = new DataLoader<string, InventoryItem | null>(
      async (ids) => {
        const results = await repository.inventoryItem.findByIds(ids);
        return ids.map((id) => results.find((item) => item.id === id) ?? null);
      }
    );

    // Load by variant ID
    this.inventoryItemByVariant = new DataLoader<string, InventoryItem | null>(
      async (variantIds) => {
        const results = await repository.inventoryItem.findByVariantIds(variantIds);
        return variantIds.map(
          (variantId) => results.find((item) => item.variantId === variantId) ?? null
        );
      }
    );
  }
}
